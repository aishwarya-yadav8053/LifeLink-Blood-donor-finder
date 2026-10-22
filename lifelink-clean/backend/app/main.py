import csv
import io
import json
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, Request, Response as HTTPResponse, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, delete, func, text
from sqlalchemy.exc import IntegrityError
from .config import ROOT, settings
from .db import Base, engine, Session, get_db
from .models import *
from .schemas import *
from .security import current_user, admin, hash_password, check_password, digest, limit
from .services import *
from .matching import GROUPS, compatible, available, distance
from .seed import seed, reset_demo, ACCOUNTS, DEMO_PASSWORD, CITIES

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    yield

app=FastAPI(title='LifeLink API',version='1.0.0',lifespan=lifespan)
origins=settings.allowed_origins.split(',')
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Content-Type','X-CSRF-Token'])

@app.middleware('http')
async def security_headers(request, call_next):
    if request.method not in ('GET','HEAD','OPTIONS'):
        origin=request.headers.get('origin')
        if origin and origin not in origins and origin != str(request.base_url).rstrip('/'):
            return JSONResponse({'detail':'Origin not allowed'},status_code=403)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='strict-origin-when-cross-origin'
    if request.url.path.startswith('/api'):
        response.headers['Cache-Control']='no-store'
    return response

@app.exception_handler(IntegrityError)
async def conflict(_, exc):
    return JSONResponse({'detail':'A record with these details already exists. Refresh and retry.'},status_code=409)

def get_or_404(db, cls, id):
    obj=db.get(cls,id)
    if not obj: raise HTTPException(404,'Record not found')
    return obj

def own_request(db,id,u):
    r=get_or_404(db,BloodRequest,id)
    if r.user_id != u.id and u.role != 'admin': raise HTTPException(403,'This request is private')
    return r

def user_data(db,u):
    out={k:getattr(u,k) for k in ['id','name','email','phone','role','demo','active']}
    d=db.scalar(select(Donor).where(Donor.user_id==u.id))
    if d:
        out['donor']={k:getattr(d,k) for k in ['blood_group','city','locality','lat','lng','available','verified','last_donation','unavailable_until','share_history','preferred_contact']}
    return out

@app.get('/api/config')
def config():
    return dict(demo_mode=settings.demo_mode,cities=CITIES,groups=GROUPS,tile_url=settings.map_tile_url,public_contact=settings.public_contact)

@app.get('/api/health')
def health(db=Depends(get_db)):
    db.execute(text('SELECT 1'));return {'status':'ok','database':'sqlite' if engine.dialect.name=='sqlite' else engine.dialect.name}

@app.post('/api/auth/register',status_code=201)
def register(body:Register,request:Request,db=Depends(get_db)):
    limit('register:'+request.client.host,10)
    email=body.email.strip().lower()
    if email.endswith('@demo.local'): raise HTTPException(422,'Reserved demo domain')
    u=User(email=email,name=body.name,phone=body.phone,role=body.role,password_hash=hash_password(body.password))
    db.add(u);db.flush()
    if u.role=='donor':
        db.add(Donor(user_id=u.id,blood_group=body.blood_group,dob=body.dob,city=body.city,locality=body.locality,lat=round(body.lat,2),lng=round(body.lng,2)))
    audit(db,u.id,'register',u.id);db.commit()
    return {'message':'Account created. Sign in to continue.'}

@app.post('/api/auth/login')
def login(body:Login,request:Request,response:HTTPResponse,db=Depends(get_db)):
    limit('login:'+request.client.host,20)
    u=db.scalar(select(User).where(User.email==body.email.strip().lower()))
    if not u or not check_password(body.password,u.password_hash) or not u.active or (u.demo and not settings.demo_mode):
        audit(db,None,'login_failed','authentication');db.commit();raise HTTPException(401,'Invalid email or password')
    token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(24)
    db.add(UserSession(user_id=u.id,token_hash=digest(token),csrf=csrf,expires=datetime.utcnow()+timedelta(hours=settings.session_hours)))
    audit(db,u.id,'login',u.id);db.commit()
    response.set_cookie('lifelink_session',token,httponly=True,samesite='lax',secure=settings.cookie_secure,max_age=settings.session_hours*3600,path='/')
    return {'user':user_data(db,u),'csrf':csrf}

@app.get('/api/auth/me')
def me(request:Request,u=Depends(current_user),db=Depends(get_db)):
    return {'user':user_data(db,u),'csrf':request.state.session.csrf}

@app.post('/api/auth/logout')
def logout(request:Request,response:HTTPResponse,u=Depends(current_user),db=Depends(get_db)):
    db.delete(request.state.session);db.commit();response.delete_cookie('lifelink_session',path='/');return {'message':'Signed out'}

@app.put('/api/profile')
def profile(body:Profile,u=Depends(current_user),db=Depends(get_db)):
    u.name=body.name;u.phone=body.phone
    d=db.scalar(select(Donor).where(Donor.user_id==u.id))
    if d:
        for k,v in body.model_dump(exclude={'name','phone'}).items(): setattr(d,k,round(v,2) if k in ('lat','lng') else v)
    audit(db,u.id,'profile_updated',u.id);db.commit();return user_data(db,u)

@app.post('/api/profile/password')
def password(body:PasswordInput,u=Depends(current_user),db=Depends(get_db)):
    if u.demo: raise HTTPException(403,'Demo passwords are fixed; use a real registration to test changes')
    if not check_password(body.current,u.password_hash): raise HTTPException(400,'Current password incorrect')
    u.password_hash=hash_password(body.new);db.execute(delete(UserSession).where(UserSession.user_id==u.id));audit(db,u.id,'password_changed',u.id);db.commit()
    return {'message':'Password changed. Sign in again.'}

@app.delete('/api/profile')
def deactivate(u=Depends(current_user),db=Depends(get_db)):
    u.active=False;db.execute(delete(UserSession).where(UserSession.user_id==u.id));audit(db,u.id,'account_deactivated',u.id);db.commit()
    return {'message':'Account deactivated. Historical audit records retained; contact the operator for erasure review.'}

@app.get('/api/stats')
def stats(db=Depends(get_db)):
    expire(db)
    users=db.scalars(scope(select(User).where(User.active==True,User.role=='donor'),User)).all()
    reqs=db.scalars(scope(select(BloodRequest),BloodRequest)).all()
    banks=db.scalars(scope(select(Bank).where(Bank.active==True),Bank)).all()
    return dict(donors=len(users),demo_donors=sum(u.demo for u in users),requests=sum(r.status in ACTIVE for r in reqs),banks=len(banks),fulfilled=sum(r.status=='fulfilled' for r in reqs))

@app.get('/api/donors')
def donors(group:Group|None=None,component:Component='red_cells',q:str='',lat:float=Query(19.08,ge=-90,le=90),lng:float=Query(72.88,ge=-180,le=180),radius:int=Query(100,ge=1,le=500),available_only:bool=False,verified_only:bool=False,sort:str='distance',page:int=Query(1,ge=1),db=Depends(get_db)):
    query=scope(select(Donor,User).join(User,Donor.user_id==User.id).where(User.active==True),User)
    out=[]
    for d,u in db.execute(query):
        if group and not compatible(d.blood_group,group,component):continue
        if q.lower() not in (d.city+' '+d.locality).lower():continue
        if available_only and not available(d) or verified_only and not d.verified:continue
        row=donor_public(db,d,u,lat,lng)
        if row['distance']<=radius:out.append(row)
    if sort=='response':out.sort(key=lambda x:(-(x['response_rate'] or 0),x['distance']))
    elif sort=='availability':out.sort(key=lambda x:(not x['available'],x['distance']))
    elif sort=='compatibility':out.sort(key=lambda x:(x['blood_group']!=group,not x['verified'],x['distance']))
    else:out.sort(key=lambda x:x['distance'])
    return {'total':len(out),'items':out[(page-1)*12:page*12],'page':page}

@app.get('/api/requests')
def public_requests(db=Depends(get_db)):
    expire(db)
    return [request_public(r) for r in db.scalars(scope(select(BloodRequest).where(BloodRequest.status.in_(ACTIVE)).order_by(BloodRequest.needed_at),BloodRequest)).all()]

@app.post('/api/requests',status_code=201)
def create_request(body:RequestInput,u=Depends(current_user),db=Depends(get_db)):
    if u.role not in ('requester','bloodbank'):raise HTTPException(403,'A requester or blood-bank account is required')
    limit('create:'+str(u.id),10)
    r=BloodRequest(**body.model_dump(),user_id=u.id,reference='LL-'+secrets.token_hex(4).upper(),demo=u.demo)
    db.add(r);db.flush();find_matches(db,r);audit(db,u.id,'request_created',r.id);db.commit();return request_public(r)

@app.put('/api/requests/{id}')
def edit_request(id:int,body:RequestInput,u=Depends(current_user),db=Depends(get_db)):
    r=own_request(db,id,u)
    if r.status not in ('pending','matched'):raise HTTPException(409,'Only pending or matched requests may be edited')
    # Keep response history; clinical details cannot change once matching was issued.
    data=body.model_dump()
    if any(getattr(r,k)!=data[k] for k in ['blood_group','component','hospital','lat','lng']):
        raise HTTPException(409,'Create a new request to change blood group, component or hospital location')
    for k,v in data.items():setattr(r,k,v)
    find_matches(db,r);audit(db,u.id,'request_edited',id);db.commit();return request_public(r)

@app.post('/api/requests/{id}/rematch')
def rematch(id:int,u=Depends(current_user),db=Depends(get_db)):
    expire(db);r=own_request(db,id,u);find_matches(db,r);db.commit();return request_public(r)

@app.post('/api/requests/{id}/status')
def request_status(id:int,body:StatusInput,u=Depends(current_user),db=Depends(get_db)):
    expire(db);r=own_request(db,id,u)
    if r.status not in ACTIVE:raise HTTPException(409,'Request is already closed')
    matches=db.scalars(select(Match).where(Match.request_id==id)).all()
    if body.status=='fulfilled' and not any(m.status=='accepted' for m in matches):raise HTTPException(409,'An accepted donor is required before fulfilment')
    r.status=body.status
    for m in matches:
        notify(db,m.donor_id,f'{r.reference} {body.status}',id)
        if body.status=='fulfilled' and m.status=='accepted':
            db.add(Donation(match_id=m.id,donor_id=m.donor_id,request_id=id))
            d=db.scalar(select(Donor).where(Donor.user_id==m.donor_id));d.available=False
    audit(db,u.id,'request_'+body.status,id);db.commit();return request_public(r)

def respond_match(db,m,u,action,simulated=False):
    r=get_or_404(db,BloodRequest,m.request_id)
    if m.donor_id!=u.id:raise HTTPException(403,'This match belongs to another donor')
    if r.status not in ACTIVE or r.needed_at <= datetime.utcnow():raise HTTPException(409,'Request is closed or expired')
    if m.status!='pending':raise HTTPException(409,'Already responded')
    if blocked(db,u.id,r.user_id):raise HTTPException(403,'Contact blocked')
    if not db.get(User,r.user_id).active:raise HTTPException(409,'Requester unavailable')
    d=db.scalar(select(Donor).where(Donor.user_id==u.id))
    if action=='accepted':
        if not available(d) or not compatible(d.blood_group,r.blood_group,r.component):raise HTTPException(409,'Donor no longer available for this request')
        if db.scalar(select(Match.id).join(BloodRequest,Match.request_id==BloodRequest.id).where(Match.donor_id==u.id,Match.status=='accepted',BloodRequest.status.in_(ACTIVE))):
            raise HTTPException(409,'You already have an active accepted request')
        if distance(d.lat,d.lng,r.lat,r.lng)>r.radius:raise HTTPException(409,'Outside the updated search radius')
        r.status='accepted';db.add(Reveal(match_id=m.id,requester_id=r.user_id,donor_id=u.id))
        audit(db,u.id,'simulated_contact_reveal' if simulated else 'contact_reveal_authorised',m.id)
    m.status=action;m.simulated=simulated;db.add(Response(match_id=m.id,action=action,simulated=simulated))
    notify(db,r.user_id,f'{u.name.split()[0]} {action} {r.reference}'+(' (SIMULATED)' if simulated else ''),r.id)
    audit(db,u.id,('simulated_' if simulated else '')+action,m.id)
    db.commit();return {'message':'Response saved','status':action}

@app.post('/api/matches/{id}/respond')
def respond(id:int,body:Respond,u=Depends(current_user),db=Depends(get_db)):
    # SQLite immediate lock serializes accept checks across simultaneous sessions.
    db.commit()
    if engine.dialect.name=='sqlite':db.execute(text('BEGIN IMMEDIATE'))
    m=get_or_404(db,Match,id);return respond_match(db,m,u,body.action)

@app.get('/api/matches/{id}/contact')
def contact(id:int,u=Depends(current_user),db=Depends(get_db)):
    m=get_or_404(db,Match,id);r=db.get(BloodRequest,m.request_id)
    if u.id not in (r.user_id,m.donor_id):raise HTTPException(403,'Contact is private')
    if m.status!='accepted' or r.status in ('cancelled','expired') or blocked(db,r.user_id,m.donor_id):raise HTTPException(403,'Contact sharing is not active')
    other=db.get(User,m.donor_id if u.id==r.user_id else r.user_id)
    if not other.active:raise HTTPException(403,'Account is unavailable')
    d=db.scalar(select(Donor).where(Donor.user_id==m.donor_id))
    method=d.preferred_contact
    audit(db,u.id,'contact_viewed',m.id);db.commit()
    return {'name':other.name,'method':method,'value':getattr(other,method),'demo':other.demo}

@app.get('/api/dashboard')
def dashboard(u=Depends(current_user),db=Depends(get_db)):
    expire(db)
    if u.role=='donor':
        # Newly registered / reactivated donors discover outstanding requests on refresh.
        for r in db.scalars(select(BloodRequest).where(BloodRequest.demo==u.demo,BloodRequest.status.in_(ACTIVE))):find_matches(db,r)
        db.commit()
        mids=db.scalars(select(Match).where(Match.donor_id==u.id)).all()
        reqs=[db.get(BloodRequest,m.request_id) for m in mids]
    else:
        reqs=db.scalars(select(BloodRequest).where(BloodRequest.user_id==u.id).order_by(BloodRequest.created_at.desc())).all()
    out=[]
    for r in reqs:
        row=request_public(r);row.update(patient=r.patient,notes=r.notes,doctor_reference=r.doctor_reference,requester_id=r.user_id)
        query=select(Match).where(Match.request_id==r.id)
        if u.role=='donor':query=query.where(Match.donor_id==u.id)
        row['matches']=[]
        for m in db.scalars(query.order_by(Match.distance)):
            du=db.get(User,m.donor_id);d=db.scalar(select(Donor).where(Donor.user_id==du.id))
            row['matches'].append(dict(id=m.id,donor_id=du.id,name=du.name.split()[0],status=m.status,distance=m.distance,simulated=m.simulated,verified=d.verified,
                explanation=f'Candidate for {r.component.replace("_"," ")}; about {m.distance} km away. Hospital confirmation required.'))
        row['documents']=[dict(id=x.id,name=x.original_name) for x in db.scalars(select(Document).where(Document.request_id==r.id))] if r.user_id==u.id else []
        out.append(row)
    return {'requests':out,'history':[dict(id=x.id,request_id=x.request_id,note=x.note,created_at=x.created_at) for x in db.scalars(select(Donation).join(BloodRequest,Donation.request_id==BloodRequest.id).where((Donation.donor_id==u.id)|(BloodRequest.user_id==u.id)))]}

@app.get('/api/notifications')
def notifications(u=Depends(current_user),db=Depends(get_db)):
    return [dict(id=n.id,message=n.message,read=n.read,request_id=n.request_id,created_at=n.created_at) for n in db.scalars(select(Notification).where(Notification.user_id==u.id).order_by(Notification.created_at.desc()).limit(100))]

@app.post('/api/notifications/read')
def read_notifications(id:int|None=None,u=Depends(current_user),db=Depends(get_db)):
    for n in db.scalars(select(Notification).where(Notification.user_id==u.id)):
        if id is None or n.id==id:n.read=True
    db.commit();return {'message':'Notifications marked read'}

@app.post('/api/reports',status_code=201)
def report(body:ReportInput,u=Depends(current_user),db=Depends(get_db)):
    get_or_404(db,User,body.target_id)
    if body.target_id==u.id:raise HTTPException(422,'Cannot report yourself')
    db.add(Report(user_id=u.id,target_id=body.target_id,reason=body.reason))
    if body.block and not db.scalar(select(Block.id).where(Block.user_id==u.id,Block.target_id==body.target_id)):
        db.add(Block(user_id=u.id,target_id=body.target_id))
    audit(db,u.id,'report_created',body.target_id);db.commit();return {'message':'Report submitted; selected block applied'}

@app.get('/api/banks')
def banks(q:str='',db=Depends(get_db)):
    rows=db.scalars(scope(select(Bank).where(Bank.active==True),Bank)).all()
    return [{k:getattr(b,k) for k in ['id','name','city','address','lat','lng','phone','hours','components','source','verified','demo','updated_at','operator_id']} for b in rows if q.lower() in (b.name+' '+b.city).lower()]

@app.put('/api/banks/{id}')
def edit_bank(id:int,body:BankInput,u=Depends(current_user),db=Depends(get_db)):
    b=get_or_404(db,Bank,id)
    if u.role!='admin' and (u.role!='bloodbank' or b.operator_id!=u.id):raise HTTPException(403,'Not your facility')
    for k,v in body.model_dump(exclude={'demo'}).items():setattr(b,k,v)
    b.verified=False;audit(db,u.id,'bank_updated',id);db.commit();return {'message':'Facility updated; verification reset'}

@app.post('/api/requests/{id}/documents',status_code=201)
async def upload(id:int,file:UploadFile=File(...),u=Depends(current_user),db=Depends(get_db)):
    own_request(db,id,u)
    data=await file.read(2*1024*1024+1)
    if len(data)>2*1024*1024:raise HTTPException(413,'Maximum upload is 2 MB')
    ext='.pdf' if data.startswith(b'%PDF-') else '.png' if data.startswith(b'\x89PNG\r\n\x1a\n') else '.jpg' if data.startswith(b'\xff\xd8\xff') else ''
    if not ext:raise HTTPException(422,'Only PDF, PNG or JPEG documents are accepted')
    folder=ROOT/'uploads';folder.mkdir(exist_ok=True)
    name=secrets.token_hex(20)+ext
    (folder/name).write_bytes(data)
    d=Document(request_id=id,filename=name,original_name=Path(file.filename or 'document').name[:150],mime='application/octet-stream')
    db.add(d);audit(db,u.id,'document_uploaded',id);db.commit();return {'id':d.id,'message':'Private document uploaded'}

@app.get('/api/documents/{id}')
def document(id:int,u=Depends(current_user),db=Depends(get_db)):
    d=get_or_404(db,Document,id);own_request(db,d.request_id,u)
    return FileResponse(ROOT/'uploads'/d.filename,media_type='application/octet-stream',filename=d.original_name)

@app.get('/api/admin')
def admin_data(u=Depends(admin),db=Depends(get_db)):
    return dict(users=[dict(id=x.id,name=x.name,role=x.role,active=x.active,demo=x.demo,verified=(db.scalar(select(Donor.verified).where(Donor.user_id==x.id)) or False)) for x in db.scalars(select(User))],
        reports=[dict(id=x.id,user_id=x.user_id,target_id=x.target_id,reason=x.reason,resolved=x.resolved) for x in db.scalars(select(Report))],
        audit=[dict(id=x.id,user_id=x.user_id,action=x.action,target=x.target,created_at=x.created_at) for x in db.scalars(select(Audit).order_by(Audit.id.desc()).limit(100))],
        requests=[request_public(x) for x in db.scalars(select(BloodRequest))])

@app.patch('/api/admin/users/{id}')
def moderate_user(id:int,body:Moderate,u=Depends(admin),db=Depends(get_db)):
    x=get_or_404(db,User,id)
    if x.id==u.id:raise HTTPException(409,'Cannot moderate your own account')
    if body.active is not None:x.active=body.active
    if body.verified is not None:
        d=db.scalar(select(Donor).where(Donor.user_id==id))
        if d:d.verified=body.verified
    notify(db,id,'An administrator updated your account status');audit(db,u.id,'user_moderated',id);db.commit();return {'message':'User updated'}

@app.patch('/api/admin/banks/{id}')
def moderate_bank(id:int,body:Moderate,u=Depends(admin),db=Depends(get_db)):
    b=get_or_404(db,Bank,id)
    for k,v in body.model_dump(exclude_none=True).items():setattr(b,k,v)
    audit(db,u.id,'bank_moderated',id);db.commit();return {'message':'Bank updated'}

@app.post('/api/admin/reports/{id}/resolve')
def resolve(id:int,u=Depends(admin),db=Depends(get_db)):
    get_or_404(db,Report,id).resolved=True;audit(db,u.id,'report_resolved',id);db.commit();return {'message':'Report resolved'}

@app.post('/api/admin/import')
async def import_banks(file:UploadFile=File(...),preview:bool=True,u=Depends(admin),db=Depends(get_db)):
    raw=await file.read(1024*1024+1)
    if len(raw)>1024*1024:raise HTTPException(413,'Maximum import is 1 MB')
    try:
        s=raw.decode('utf-8-sig');rows=json.loads(s) if (file.filename or '').endswith('.json') else list(csv.DictReader(io.StringIO(s)))
        if not isinstance(rows,list) or len(rows)>500:raise ValueError('Use an array of up to 500 rows')
    except (ValueError,UnicodeError):raise HTTPException(422,'Invalid CSV/JSON, or more than 500 records')
    valid=[];errors=[];seen=set()
    for i,row in enumerate(rows):
        try:
            b=BankInput.model_validate(row)
            key=(b.name,b.city)
            if key in seen or db.scalar(select(Bank.id).where(Bank.name==b.name,Bank.city==b.city)):raise ValueError('Duplicate name and city')
            if b.demo and not settings.demo_mode:raise ValueError('Demo records disabled')
            seen.add(key);valid.append(b.model_dump())
        except ValueError as e:errors.append({'row':i+1,'error':str(e)[:250]})
    if not preview:
        if errors:raise HTTPException(422,{'message':'Fix invalid rows before import','errors':errors})
        for row in valid:db.add(Bank(**row))
        audit(db,u.id,'bank_import',len(valid));db.commit()
    return {'preview':preview,'valid':valid,'errors':errors,'count':len(valid)}

def require_demo():
    if not settings.demo_mode:raise HTTPException(404,'Showcase mode is disabled')

@app.get('/api/demo')
def demo():
    require_demo();return {'accounts':[dict(email=e,name=n,role=r,password=DEMO_PASSWORD) for e,n,r in ACCOUNTS]}

@app.post('/api/demo/reset')
def reset(u=Depends(admin),db=Depends(get_db)):
    require_demo();reset_demo(db);return {'message':'Demo reset. Sign in again. Real accounts were preserved.'}

@app.post('/api/demo/scenario')
def scenario(body:Scenario,u=Depends(admin),db=Depends(get_db)):
    require_demo()
    requester=db.scalar(select(User).where(User.email=='requester@demo.local'))
    if not requester:raise HTTPException(409,'Seed demo accounts first')
    r=BloodRequest(user_id=requester.id,reference='LL-DEMO-'+secrets.token_hex(3).upper(),patient='Demo patient',blood_group='O+',component='red_cells',units=2,hospital='Showcase Scenario Hospital',city='Mumbai',locality='Demo locality',lat=19.08 if body.scenario!='no_nearby' else 10.0,lng=72.88,needed_at=datetime.utcnow()+timedelta(days=2),urgency='urgent',radius=100 if body.scenario=='multiple' else 5,demo=True)
    db.add(r);db.flush();find_matches(db,r);audit(db,u.id,'scenario_'+body.scenario,r.id);db.commit();return request_public(r)

@app.post('/api/demo/matches/{id}/simulate')
def simulate(id:int,body:Respond,u=Depends(admin),db=Depends(get_db)):
    require_demo();db.commit()
    if engine.dialect.name=='sqlite':db.execute(text('BEGIN IMMEDIATE'))
    m=get_or_404(db,Match,id);r=db.get(BloodRequest,m.request_id);donor=db.get(User,m.donor_id)
    if not r.demo or not donor.demo:raise HTTPException(403,'Simulation cannot affect real accounts')
    audit(db,u.id,'simulation_requested',id);return respond_match(db,m,donor,body.action,True)

# A compiled frontend can run on the same port as FastAPI (no second server needed).
dist=ROOT.parent/'frontend'/'dist'
if dist.exists():
    app.mount('/assets',StaticFiles(directory=dist/'assets'),name='assets')
    @app.get('/{path:path}',include_in_schema=False)
    def spa(path:str):
        if path.startswith(('api/','uploads/')):raise HTTPException(404,'Not found')
        return FileResponse(dist/'index.html')
