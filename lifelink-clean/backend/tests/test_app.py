import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

# Never run tests against the working user's database.
TEST_DIR=tempfile.TemporaryDirectory(prefix='lifelink-tests-')
os.environ['DATABASE_URL']='sqlite:///'+str(Path(TEST_DIR.name)/'test.db')
os.environ['DEMO_MODE']='true'
from fastapi.testclient import TestClient
from sqlalchemy import select
import pytest
from app.main import app
from app.db import Base,engine,Session
from app.config import settings
from app.seed import seed,DEMO_PASSWORD
from app.models import User,UserSession,Donor,BloodRequest,Match,Audit,Reveal
from app.security import _limits,check_password
from app.matching import compatible,distance

@pytest.fixture(autouse=True)
def database():
    settings.demo_mode=True
    Base.metadata.drop_all(engine);Base.metadata.create_all(engine);_limits.clear()
    with Session() as db:seed(db)
    yield
    settings.demo_mode=True

def client(role='requester'):
    emails={'requester':'requester@demo.local','donor':'donor.opositive@demo.local','other':'donor.anegative@demo.local','admin':'admin@demo.local','bank':'bloodbank@demo.local'}
    c=TestClient(app)
    r=c.post('/api/auth/login',json={'email':emails[role],'password':DEMO_PASSWORD})
    assert r.status_code==200,r.text
    c.headers['X-CSRF-Token']=r.json()['csrf']
    return c

def request_body(**overrides):
    b=dict(patient='AB',blood_group='O+',component='red_cells',units=2,hospital='Test Hospital',city='Mumbai',locality='Test district',lat=19.08,lng=72.88,needed_at=(datetime.utcnow()+timedelta(days=1)).isoformat(),radius=100,urgency='urgent')
    b.update(overrides);return b

def create(c,**overrides):
    r=c.post('/api/requests',json=request_body(**overrides));assert r.status_code==201,r.text;return r.json()

def matching(c,rid):
    return next(r for r in c.get('/api/dashboard').json()['requests'] if r['id']==rid)['matches']

def test_registration_hashing_and_permissions():
    c=TestClient(app)
    body=dict(email='real@example.com',password='StrongPass!2026',name='Test Adult',phone='TEST-ONLY',role='donor',consent=True,blood_group='O+',city='Mumbai',dob='1995-01-01',lat=19.081234,lng=72.889912)
    assert c.post('/api/auth/register',json=body).status_code==201
    assert c.post('/api/auth/register',json=body).status_code==409
    with Session() as db:
        u=db.scalar(select(User).where(User.email==body['email']))
        assert u.password_hash!=body['password'] and check_password(body['password'],u.password_hash)
        d=db.scalar(select(Donor).where(Donor.user_id==u.id));assert d.lat==19.08 and d.lng==72.89
    bad=dict(body,email='another@example.com',role='admin')
    assert c.post('/api/auth/register',json=bad).status_code==422
    bad=dict(body,email='another@example.com',dob='2020-01-01')
    assert c.post('/api/auth/register',json=bad).status_code==422

def test_login_logout_csrf_and_session():
    c=TestClient(app)
    assert c.get('/api/dashboard').status_code==401
    assert c.post('/api/auth/login',json={'email':'x@example.com','password':'wrong'}).status_code==401
    c=client();assert c.get('/api/auth/me').status_code==200
    assert c.post('/api/requests',json=request_body(),headers={'X-CSRF-Token':'bad'}).status_code==403
    assert c.post('/api/requests',json=request_body(),headers={'Origin':'https://evil.example'}).status_code==403
    assert c.get('/api/admin').status_code==403
    assert c.post('/api/auth/logout').status_code==200
    assert c.get('/api/auth/me').status_code==401

def test_acceptance_contact_and_fulfilment():
    requester=client();donor=client('donor');other=client('other');admin=client('admin')
    r=create(requester);m=matching(donor,r['id'])[0]
    assert requester.get(f'/api/matches/{m["id"]}/contact').status_code==403
    assert other.post(f'/api/matches/{m["id"]}/respond',json={'action':'accepted'}).status_code==403
    response=donor.post(f'/api/matches/{m["id"]}/respond',json={'action':'accepted'})
    assert response.status_code==200,response.text
    assert donor.post(f'/api/matches/{m["id"]}/respond',json={'action':'accepted'}).status_code==409
    contact=requester.get(f'/api/matches/{m["id"]}/contact');assert contact.status_code==200
    assert contact.json()['value']=='donor.opositive@demo.local'
    assert 'phone' not in contact.json()
    assert admin.get(f'/api/matches/{m["id"]}/contact').status_code==403
    assert other.get(f'/api/matches/{m["id"]}/contact').status_code==403
    assert any('accepted' in n['message'] for n in requester.get('/api/notifications').json())
    assert requester.post(f'/api/requests/{r["id"]}/status',json={'status':'fulfilled'}).status_code==200
    assert donor.get('/api/dashboard').json()['history']
    with Session() as db:
        assert db.scalar(select(Reveal).where(Reveal.match_id==m['id']))
        assert db.scalar(select(Audit).where(Audit.action=='contact_reveal_authorised'))

def test_reject_and_no_unauthorised_edit():
    a=client();d=client('donor');r=create(a);m=matching(d,r['id'])[0]
    assert d.post(f'/api/matches/{m["id"]}/respond',json={'action':'rejected'}).status_code==200
    assert a.get(f'/api/matches/{m["id"]}/contact').status_code==403
    assert d.post(f'/api/requests/{r["id"]}/status',json={'status':'cancelled'}).status_code==403
    assert a.put(f'/api/requests/{r["id"]}',json=request_body(blood_group='AB+')).status_code==409
    assert a.put(f'/api/requests/{r["id"]}',json=request_body(radius=150)).status_code==200

def test_public_privacy_and_radius():
    c=TestClient(app);data=c.get('/api/donors?radius=100').json()
    assert data['items']
    for d in data['items']:
        assert not {'phone','email','dob','password_hash','last_donation_date'}&d.keys()
        assert round(d['lat'],2)==d['lat'] and round(d['lng'],2)==d['lng']
    assert c.get('/api/donors?lat=0&lng=0&radius=1').json()['total']==0
    assert c.get('/api/donors?lat=1000').status_code==422
    for r in c.get('/api/requests').json():
        assert not {'patient','notes','phone','email','doctor_reference'}&r.keys()
    assert c.get('/api/donors?group=O%2B').json()['items']
    assert all(d['blood_group'] in ('O+','O-') for d in c.get('/api/donors?group=O%2B').json()['items'])

@pytest.mark.parametrize('donor,recipient,component,expected',[
    ('O-','AB+','red_cells',True),('O+','O-','red_cells',False),('A-','O+','red_cells',False),
    ('AB+','O-','plasma',True),('O+','AB+','plasma',False),('O-','A+','whole_blood',False),
    ('A+','A+','platelets',True),('BAD','O+','red_cells',False)])
def test_compatibility(donor,recipient,component,expected):
    assert compatible(donor,recipient,component)==expected
    assert distance(19,72,19,72)==0

def test_real_demo_isolation_and_demo_off():
    c=TestClient(app)
    body=dict(email='new@example.com',password='StrongPass!2026',name='New User',phone='TEST-ONLY',role='requester',consent=True)
    assert c.post('/api/auth/register',json=body).status_code==201
    login=c.post('/api/auth/login',json=body).json();c.headers['X-CSRF-Token']=login['csrf']
    r=create(c);assert matching(c,r['id'])==[]
    settings.demo_mode=False
    assert TestClient(app).get('/api/demo').status_code==404
    assert TestClient(app).get('/api/donors').json()['total']==0
    assert TestClient(app).get('/api/banks').json()==[]
    assert TestClient(app).post('/api/auth/login',json={'email':'requester@demo.local','password':DEMO_PASSWORD}).status_code==401
    assert c.get('/api/auth/me').status_code==200

def test_admin_import_validation():
    admin=client('admin');regular=client()
    content=b'name,city,address,lat,lng,source,demo\nImported Demo,Palghar,Fictional city centre,19.7,72.77,Test dataset,true\n'
    args={'files':{'file':('sample.csv',content,'text/csv')}}
    assert regular.post('/api/admin/import',**args).status_code==403
    preview=admin.post('/api/admin/import?preview=true',**args)
    assert preview.status_code==200 and preview.json()['count']==1
    assert admin.post('/api/admin/import?preview=false',**args).status_code==200
    assert admin.post('/api/admin/import?preview=false',**args).status_code==422
    bad=b'[{"name":"broken"}]'
    assert admin.post('/api/admin/import',files={'file':('bad.json',bad,'application/json')}).json()['errors']

def test_block_revokes_contact():
    a=client();d=client('donor');r=create(a);m=matching(d,r['id'])[0]
    d.post(f'/api/matches/{m["id"]}/respond',json={'action':'accepted'})
    assert a.post('/api/reports',json={'target_id':m['donor_id'],'reason':'Testing privacy blocking','block':True}).status_code==201
    assert a.get(f'/api/matches/{m["id"]}/contact').status_code==403
    assert d.get(f'/api/matches/{m["id"]}/contact').status_code==403

def test_documents_private_and_validated():
    a=client();d=client('donor');r=create(a)
    assert a.post(f'/api/requests/{r["id"]}/documents',files={'file':('bad.html',b'<script>bad</script>','text/html')}).status_code==422
    with tempfile.TemporaryDirectory() as folder:
        import app.main as main
        original=main.ROOT;main.ROOT=Path(folder)
        try:
            uploaded=a.post(f'/api/requests/{r["id"]}/documents',files={'file':('sample.pdf',b'%PDF-1.4\n%%EOF','application/pdf')})
            assert uploaded.status_code==201
            id=uploaded.json()['id']
            assert a.get(f'/api/documents/{id}').status_code==200
            assert d.get(f'/api/documents/{id}').status_code==403
        finally:main.ROOT=original

def test_reset_preserves_real_user():
    c=TestClient(app)
    c.post('/api/auth/register',json=dict(email='keep@example.com',password='StrongPass!2026',name='Keep Me',phone='TEST',role='requester',consent=True))
    a=client('admin');assert a.post('/api/demo/reset').status_code==200
    with Session() as db:
        assert db.scalar(select(User).where(User.email=='keep@example.com'))
        assert len(db.scalars(select(Donor)).all())==24
    assert a.get('/api/auth/me').status_code==401

def test_rate_limit():
    c=TestClient(app)
    for _ in range(20):c.post('/api/auth/login',json={'email':'bad@example.com','password':'wrong'})
    assert c.post('/api/auth/login',json={'email':'bad@example.com','password':'wrong'}).status_code==429

def test_expired_request_no_acceptance():
    a=client();d=client('donor');r=create(a);m=matching(d,r['id'])[0]
    with Session() as db:
        db.get(BloodRequest,r['id']).needed_at=datetime.utcnow()-timedelta(hours=1);db.commit()
    assert d.post(f'/api/matches/{m["id"]}/respond',json={'action':'accepted'}).status_code==409
    assert next(x for x in a.get('/api/dashboard').json()['requests'] if x['id']==r['id'])['status']=='expired'

def test_unavailable_and_commitment():
    a=client();d=client('donor');r=create(a);second=create(a)
    first=matching(d,r['id'])[0];other=matching(d,second['id'])[0]
    assert d.post(f'/api/matches/{first["id"]}/respond',json={'action':'accepted'}).status_code==200
    assert d.post(f'/api/matches/{other["id"]}/respond',json={'action':'accepted'}).status_code==409

def test_simulation_restricted_and_audited():
    a=client();d=client('donor');admin=client('admin');r=create(a);m=matching(d,r['id'])[0]
    assert a.post(f'/api/demo/matches/{m["id"]}/simulate',json={'action':'accepted'}).status_code==403
    assert admin.post(f'/api/demo/matches/{m["id"]}/simulate',json={'action':'accepted'}).status_code==200
    with Session() as db:
        assert db.get(Match,m['id']).simulated
        assert db.scalar(select(Audit).where(Audit.action=='simulated_accepted'))

def test_bank_operator_scope():
    b=client('bank');banks=b.get('/api/banks').json()
    other=banks[1]
    body={k:other[k] for k in ['name','city','address','lat','lng','phone','hours','components','source','demo']}
    assert b.put('/api/banks/'+str(other['id']),json=body).status_code==403

