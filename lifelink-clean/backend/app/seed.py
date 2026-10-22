from datetime import date, datetime, timedelta
import secrets
from sqlalchemy import select, delete
from .db import Base, engine, Session
from .models import *
from .security import hash_password
from .config import settings
from .services import find_matches, audit

CITIES = {'Mumbai': [19.08,72.88], 'Navi Mumbai': [19.03,73.02], 'Thane': [19.22,72.98], 'Vasai–Virar': [19.40,72.83], 'Palghar': [19.70,72.77]}
DEMO_PASSWORD = 'LifeLinkDemo!2026'
ACCOUNTS = [('requester@demo.local','Mira Demo','requester'),('donor.opositive@demo.local','Aarav Demo','donor'),
    ('donor.anegative@demo.local','Isha Demo','donor'),('bloodbank@demo.local','Bank Demo','bloodbank'),('admin@demo.local','Admin Demo','admin')]

def seed(db):
    if not settings.demo_mode:
        raise ValueError('Set DEMO_MODE=true to seed fictional data')
    if db.scalar(select(User.id).where(User.email == ACCOUNTS[0][0])):
        return
    pw = hash_password(DEMO_PASSWORD)
    users = []
    for email, name, role in ACCOUNTS:
        u = User(email=email,name=name,role=role,password_hash=pw,phone='DEMO-NOT-CALLABLE',demo=True)
        db.add(u); db.flush(); users.append(u)
    donor_users = [users[1], users[2]]
    for i in range(22):
        u = User(email=f'donor{i+3}@demo.local',name=f'{["Kabir","Sana","Riya","Dev","Neha","Arjun"][i%6]} Demo {i+3}',role='donor',password_hash=pw,phone='DEMO-NOT-CALLABLE',demo=True)
        db.add(u); db.flush(); donor_users.append(u)
    groups = ['O+','A-','O-','B+','AB+','A+','B-','AB-']
    for i,u in enumerate(donor_users):
        city = list(CITIES)[i%5] if i > 3 else 'Mumbai'
        lat,lng=CITIES[city]
        db.add(Donor(user_id=u.id,blood_group=groups[i%8],dob=date(1995,5,15),city=city,locality='Demo locality',
            lat=round(lat+(i%3)*.02,2),lng=round(lng+(i%2)*.02,2),verified=i%3 != 2,available=i%7 != 6,
            last_donation=date.today()-timedelta(days=180+i),share_history=True))
    for i,(city,(lat,lng)) in enumerate(CITIES.items()):
        db.add(Bank(name=f'{city} Showcase Blood Centre',city=city,address='Fictional facility at city centre — do not travel here',lat=lat,lng=lng,
            phone='DEMO-NOT-CALLABLE',hours='Demo: 09:00–18:00',components='red_cells,plasma,platelets,whole_blood',source='LifeLink fictional showcase data',demo=True,operator_id=users[3].id if i==0 else None))
    db.flush()
    for i,group in enumerate(['O+','B+','AB-']):
        r=BloodRequest(user_id=users[0].id,reference='LL-DEMO-'+secrets.token_hex(3).upper(),patient='Demo patient',blood_group=group,component='red_cells',units=2,
            hospital=f'Showcase Hospital {i+1}',city='Mumbai',locality='Demo locality',lat=19.08,lng=72.88,needed_at=datetime.utcnow()+timedelta(days=2),urgency='urgent' if i==0 else 'scheduled',radius=80,demo=True)
        db.add(r);db.flush();find_matches(db,r)
    audit(db,users[4].id,'seed_demo','24 fictional donors; 5 fictional facilities')
    db.commit()

def reset_demo(db):
    # Only remove demo-owned records. Real accounts/requests/banks are preserved.
    ids=list(db.scalars(select(User.id).where(User.demo == True)))
    reqs=list(db.scalars(select(BloodRequest.id).where(BloodRequest.demo == True)))
    mids=list(db.scalars(select(Match.id).where(Match.request_id.in_(reqs))))
    for cls,condition in [(Reveal,Reveal.match_id.in_(mids)),(Response,Response.match_id.in_(mids)),(Donation,Donation.request_id.in_(reqs)),
        (Document,Document.request_id.in_(reqs)),(Notification,Notification.user_id.in_(ids)),(Match,Match.id.in_(mids)),
        (BloodRequest,BloodRequest.id.in_(reqs)),(Bank,Bank.demo == True),
        (Report,(Report.user_id.in_(ids))|(Report.target_id.in_(ids))),(Block,(Block.user_id.in_(ids))|(Block.target_id.in_(ids))),
        (Audit,Audit.user_id.in_(ids)),(UserSession,UserSession.user_id.in_(ids)),(Donor,Donor.user_id.in_(ids)),(User,User.id.in_(ids))]:
        db.execute(delete(cls).where(condition))
    db.commit();seed(db)

if __name__ == '__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--reset-demo',action='store_true');args=parser.parse_args()
    Base.metadata.create_all(engine)
    with Session() as db:
        reset_demo(db) if args.reset_demo else seed(db)
    print('Demo database ready. Password: '+DEMO_PASSWORD)
