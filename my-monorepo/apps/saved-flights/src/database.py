from sqlalchemy import create_engine, event, TypeDecorator, String as SQLAlchemyString, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.types import TypeDecorator
from .config import Config
import os
import uuid

# Check if we should use SQLite for local development
USE_SQLITE = Config.USE_SQLITE

class UUIDString(TypeDecorator):
    """Convert UUID to string for SQLite storage"""
    impl = SQLAlchemyString(36)
    cache_ok = True  # Enable caching for better performance

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        # Convert UUID to string for database storage
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        # Convert string back to UUID for Python
        try:
            return uuid.UUID(value)
        except (ValueError, TypeError):
            return value

if USE_SQLITE:
    # Use SQLite for local development
    db_url = 'sqlite:///flights.db'
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

    # Add UUID support for SQLite
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

else:
    # Use PostgreSQL (Supabase or local)
    engine = create_engine(Config.DATABASE_URL)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
Base = declarative_base()


def get_db() -> Session:
    """Get database session with proper cleanup"""
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
