import hashlib
import secrets
from collections import defaultdict, deque
from datetime import datetime
from threading import Lock
from time import monotonic
import bcrypt
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from .db import get_db
from .models import User, UserSession
from .config import settings

def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()

def hash_password(password):
    if len(password.encode()) > 72:
        raise HTTPException(422, 'Password exceeds 72 bytes')
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def check_password(password, hashed):
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False

def current_user(request: Request, db=Depends(get_db)):
    session = db.scalar(select(UserSession).where(UserSession.token_hash == digest(request.cookies.get('lifelink_session', ''))))
    if not session or session.expires <= datetime.utcnow():
        raise HTTPException(401, 'Please sign in')
    user = db.get(User, session.user_id)
    if not user.active or (user.demo and not settings.demo_mode):
        raise HTTPException(401, 'Account unavailable')
    if request.method not in ('GET', 'HEAD', 'OPTIONS'):
        if not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), session.csrf):
            raise HTTPException(403, 'Invalid CSRF token; refresh the page')
    request.state.session = session
    return user

def admin(user=Depends(current_user)):
    if user.role != 'admin':
        raise HTTPException(403, 'Administrator access required')
    return user

_limits = defaultdict(deque)
_lock = Lock()
def limit(key, count, seconds=60):
    with _lock:
        t = monotonic()
        # Bound memory by removing inactive keys periodically.
        if len(_limits) > 2000:
            for old in list(_limits):
                if not _limits[old] or t - _limits[old][-1] > 3600:
                    del _limits[old]
        q = _limits[key]
        while q and t - q[0] > seconds:
            q.popleft()
        if len(q) >= count:
            raise HTTPException(429, 'Too many attempts; wait a minute and retry')
        q.append(t)
