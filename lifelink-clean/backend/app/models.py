from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import mapped_column as col
from .db import Base

def now():
    return datetime.utcnow()

class Stamp:
    id = col(Integer, primary_key=True)
    created_at = col(DateTime, default=now)
    updated_at = col(DateTime, default=now, onupdate=now)

class User(Stamp, Base):
    __tablename__ = 'users'
    email = col(String(254), unique=True, index=True)
    password_hash = col(String(200))
    name = col(String(80))
    phone = col(String(30))
    role = col(String(20), index=True)
    demo = col(Boolean, default=False, index=True)
    active = col(Boolean, default=True)
    consent_at = col(DateTime, default=now)

class Donor(Stamp, Base):
    __tablename__ = 'donor_profiles'
    user_id = col(ForeignKey('users.id'), unique=True)
    blood_group = col(String(3), index=True)
    city = col(String(80), index=True)
    locality = col(String(100), default='')
    dob = col(Date)
    lat = col(Float)
    lng = col(Float)
    available = col(Boolean, default=True)
    verified = col(Boolean, default=False)
    last_donation = col(Date, nullable=True)
    unavailable_until = col(Date, nullable=True)
    share_history = col(Boolean, default=False)
    preferred_contact = col(String(10), default='email')

class BloodRequest(Stamp, Base):
    __tablename__ = 'blood_requests'
    user_id = col(ForeignKey('users.id'), index=True)
    reference = col(String(30), unique=True)
    patient = col(String(80))
    blood_group = col(String(3), index=True)
    component = col(String(20))
    units = col(Integer)
    hospital = col(String(120))
    city = col(String(80), index=True)
    locality = col(String(100), default='')
    lat = col(Float)
    lng = col(Float)
    needed_at = col(DateTime)
    urgency = col(String(15))
    doctor_reference = col(String(120), default='')
    notes = col(Text, default='')
    radius = col(Integer, default=50)
    status = col(String(20), default='pending', index=True)
    demo = col(Boolean, default=False)

class Match(Stamp, Base):
    __tablename__ = 'donor_matches'
    request_id = col(ForeignKey('blood_requests.id'), index=True)
    donor_id = col(ForeignKey('users.id'), index=True)
    status = col(String(20), default='pending')
    distance = col(Float)
    simulated = col(Boolean, default=False)
    __table_args__ = (UniqueConstraint('request_id', 'donor_id'),)

class Response(Stamp, Base):
    __tablename__ = 'request_responses'
    match_id = col(ForeignKey('donor_matches.id'))
    action = col(String(20))
    simulated = col(Boolean, default=False)

class Reveal(Stamp, Base):
    __tablename__ = 'contact_reveals'
    match_id = col(ForeignKey('donor_matches.id'), unique=True)
    requester_id = col(ForeignKey('users.id'))
    donor_id = col(ForeignKey('users.id'))

class Donation(Stamp, Base):
    __tablename__ = 'donations'
    match_id = col(ForeignKey('donor_matches.id'), unique=True)
    donor_id = col(ForeignKey('users.id'))
    request_id = col(ForeignKey('blood_requests.id'))
    note = col(String(180), default='Requester reported fulfilment; donation not medically verified')

class Bank(Stamp, Base):
    __tablename__ = 'blood_banks'
    name = col(String(120))
    city = col(String(80), index=True)
    address = col(String(200))
    lat = col(Float)
    lng = col(Float)
    phone = col(String(30), default='')
    hours = col(String(100), default='Confirm with facility')
    components = col(String(200), default='Confirm with facility')
    source = col(String(200))
    verified = col(Boolean, default=False)
    demo = col(Boolean, default=False)
    active = col(Boolean, default=True)
    operator_id = col(ForeignKey('users.id'), nullable=True)
    __table_args__ = (UniqueConstraint('name', 'city'),)

class Notification(Stamp, Base):
    __tablename__ = 'notifications'
    user_id = col(ForeignKey('users.id'), index=True)
    message = col(String(240))
    request_id = col(ForeignKey('blood_requests.id'), nullable=True)
    read = col(Boolean, default=False)

class Report(Stamp, Base):
    __tablename__ = 'reports'
    user_id = col(ForeignKey('users.id'))
    target_id = col(ForeignKey('users.id'))
    reason = col(String(500))
    resolved = col(Boolean, default=False)

class Block(Stamp, Base):
    __tablename__ = 'blocked_users'
    user_id = col(ForeignKey('users.id'))
    target_id = col(ForeignKey('users.id'))
    __table_args__ = (UniqueConstraint('user_id', 'target_id'),)

class Audit(Stamp, Base):
    __tablename__ = 'audit_logs'
    user_id = col(ForeignKey('users.id'), nullable=True)
    action = col(String(100))
    target = col(String(100))

class Document(Stamp, Base):
    __tablename__ = 'uploaded_documents'
    request_id = col(ForeignKey('blood_requests.id'), index=True)
    filename = col(String(100))
    original_name = col(String(150))
    mime = col(String(80))

class UserSession(Stamp, Base):
    __tablename__ = 'user_sessions'
    user_id = col(ForeignKey('users.id'), index=True)
    token_hash = col(String(64), unique=True)
    csrf = col(String(100))
    expires = col(DateTime)
