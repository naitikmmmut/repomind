from sqlalchemy import create_engine, Column, String, Text, DateTime, JSON
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import uuid

SQLALCHEMY_DATABASE_URL = "sqlite:///./repomind_chats.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Repository(Base):
    __tablename__ = "repositories"

    collection_name = Column(String, primary_key=True)
    repo_url = Column(String)
    status = Column(String)  # completed, failed, etc.
    report = Column(JSON, nullable=True) # stores file counts, languages etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, index=True)        # groups messages into one conversation
    collection_name = Column(String, index=True)   # which repo this chat belongs to
    role = Column(String)                          # "user" or "assistant"
    content = Column(Text)
    intent = Column(String, nullable=True)         # explain / bug / architecture / general
    timestamp = Column(DateTime, default=datetime.utcnow)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    collection_name = Column(String, index=True)
    title = Column(String)                         # auto-generated from first message
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
