"""Explicit local operator commands; never exposes role promotion via public registration."""
import argparse
import getpass
import sqlite3
from pathlib import Path
from sqlalchemy import select
from .db import Base,engine,Session
from .models import User,Bank
from .security import hash_password
from .services import audit

def main():
    p=argparse.ArgumentParser(description='LifeLink local database administration')
    sub=p.add_subparsers(dest='command',required=True)
    sub.add_parser('init')
    admin=sub.add_parser('create-admin');admin.add_argument('--email',required=True)
    assign=sub.add_parser('assign-bank');assign.add_argument('--email',required=True);assign.add_argument('--bank-id',type=int,required=True)
    backup=sub.add_parser('backup');backup.add_argument('--output',required=True)
    args=p.parse_args();Base.metadata.create_all(engine)
    if args.command=='init':print('Tables created. Existing rows were preserved.');return
    if args.command=='backup':
        if engine.dialect.name!='sqlite':p.error('Use your database provider backup tool for non-SQLite databases')
        path=Path(args.output).resolve()
        if path.exists():p.error('Output already exists; choose a new backup filename')
        path.parent.mkdir(parents=True,exist_ok=True)
        with sqlite3.connect(engine.url.database) as source,sqlite3.connect(path) as target:source.backup(target)
        print('Backup created: '+str(path));return
    with Session() as db:
        email=args.email.strip().lower()
        user=db.scalar(select(User).where(User.email==email))
        if args.command=='create-admin':
            if user:p.error('Email already exists. Use a new operator address; this command does not promote existing users.')
            if '@' not in email or email.endswith('@demo.local'):p.error('Use a valid non-demo email')
            password=getpass.getpass('New administrator password (10+ characters): ')
            if len(password)<10 or len(password.encode())>72:p.error('Use 10+ characters and no more than 72 UTF-8 bytes')
            if password!=getpass.getpass('Confirm password: '):p.error('Passwords do not match')
            user=User(email=email,name='Platform Operator',phone='Not provided',role='admin',password_hash=hash_password(password))
            db.add(user);db.flush();audit(db,user.id,'local_admin_created',user.id)
        elif args.command=='assign-bank':
            bank=db.get(Bank,args.bank_id)
            if not user or not bank:p.error('User or blood bank not found')
            if user.role not in ('requester','bloodbank'):p.error('Register a dedicated requester account first; do not convert a donor/admin')
            if user.demo!=bank.demo:p.error('Do not mix demo and real operators/facilities')
            user.role='bloodbank';bank.operator_id=user.id;audit(db,user.id,'local_bank_assignment',bank.id)
        db.commit();print('Operation complete.')

if __name__=='__main__':main()
