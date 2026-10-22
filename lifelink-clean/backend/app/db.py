from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import ROOT, settings

url = settings.database_url
if url.startswith('sqlite:///') and not url.startswith('sqlite:////'):
    path = ROOT / url.removeprefix('sqlite:///')
    path.parent.mkdir(parents=True, exist_ok=True)
    url = 'sqlite:///' + str(path)
engine = create_engine(url, connect_args={'check_same_thread': False, 'timeout': 15} if url.startswith('sqlite') else {})
if url.startswith('sqlite'):
    @event.listens_for(engine, 'connect')
    def sqlite_setup(conn, _):
        conn.execute('PRAGMA foreign_keys=ON')
        conn.execute('PRAGMA journal_mode=WAL')

class Base(DeclarativeBase):
    pass

Session = sessionmaker(engine, expire_on_commit=False)

def get_db():
    with Session() as db:
        yield db
