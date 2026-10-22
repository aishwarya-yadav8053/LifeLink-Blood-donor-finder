from datetime import datetime
from sqlalchemy import select, or_, and_
from .models import User, Donor, BloodRequest, Match, Notification, Audit, Block
from .matching import available, compatible, distance
from .config import settings

ACTIVE = ['pending', 'matching', 'matched', 'accepted']

def audit(db, user_id, action, target):
    db.add(Audit(user_id=user_id, action=action, target=str(target)))

def notify(db, user_id, message, request_id=None):
    db.add(Notification(user_id=user_id, message=message, request_id=request_id))

def blocked(db, a, b):
    return db.scalar(select(Block.id).where(or_(and_(Block.user_id == a, Block.target_id == b), and_(Block.user_id == b, Block.target_id == a)))) is not None

def expire(db):
    rows = db.scalars(select(BloodRequest).where(BloodRequest.status.in_(ACTIVE), BloodRequest.needed_at < datetime.utcnow())).all()
    for r in rows:
        r.status = 'expired'
        notify(db, r.user_id, f'{r.reference} expired', r.id)
        for m in db.scalars(select(Match).where(Match.request_id == r.id)):
            notify(db, m.donor_id, f'{r.reference} expired', r.id)
    db.commit()

def donor_public(db, d, u, lat=19.08, lng=72.88):
    responses = db.scalars(select(Match).where(Match.donor_id == u.id)).all()
    rate = round(100 * sum(m.status != 'pending' for m in responses) / len(responses)) if responses else None
    return dict(id=u.id, name=u.name.split()[0], blood_group=d.blood_group, city=d.city, locality=d.locality,
        lat=d.lat, lng=d.lng, distance=distance(lat, lng, d.lat, d.lng), available=available(d), verified=d.verified,
        demo=u.demo, last_donation=str(d.last_donation)[:7] if d.share_history and d.last_donation else None, response_rate=rate)

def request_public(r):
    return {k:getattr(r,k) for k in ['id','reference','blood_group','component','units','hospital','city','locality','lat','lng','needed_at','urgency','status','demo','created_at','radius']}

def find_matches(db, r):
    if r.status not in ACTIVE:
        return []
    # Real and fictional users never match each other.
    candidates = db.execute(select(Donor, User).join(User, Donor.user_id == User.id).where(User.active == True, User.demo == r.demo)).all()
    output = []
    for d, u in candidates:
        if not available(d) or not compatible(d.blood_group, r.blood_group, r.component) or blocked(db, u.id, r.user_id):
            continue
        km = distance(r.lat, r.lng, d.lat, d.lng)
        if km > r.radius:
            continue
        commitment = db.scalar(select(Match.id).join(BloodRequest, Match.request_id == BloodRequest.id).where(
            Match.donor_id == u.id, Match.status == 'accepted', BloodRequest.status.in_(ACTIVE), BloodRequest.id != r.id))
        if commitment:
            continue
        m = db.scalar(select(Match).where(Match.request_id == r.id, Match.donor_id == u.id))
        if not m:
            m = Match(request_id=r.id, donor_id=u.id, distance=km)
            db.add(m)
            notify(db, u.id, f'{r.urgency.title()}: {r.blood_group} requested at {r.hospital}', r.id)
        output.append(m)
    if r.status != 'accepted':
        r.status = 'matched' if output else 'pending'
    db.flush()
    return output

def scope(query, model):
    return query if settings.demo_mode else query.where(model.demo == False)
