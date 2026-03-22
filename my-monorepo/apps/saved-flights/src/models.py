from sqlalchemy import Column, String, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.sql import func
from .database import Base, USE_SQLITE, UUIDString
import uuid
import os

# Use appropriate UUID type based on database
if USE_SQLITE:
    UUIDType = UUIDString  # Custom type that converts UUID to string for SQLite
else:
    UUIDType = PostgresUUID(as_uuid=True)  # PostgreSQL uses native UUID type


class Flight(Base):
    __tablename__ = 'flights'

    flight_id = Column(UUIDType, primary_key=True, default=lambda: str(uuid.uuid4()))
    flight_number = Column(String(50), nullable=False)
    airline = Column(String(100), nullable=False)
    datetime_departure = Column(DateTime(timezone=True), nullable=False)
    datetime_arrival = Column(DateTime(timezone=True), nullable=False)
    external_link = Column(String(500))
    trip_id = Column(UUIDType)  # UUID reference to trip from another service
    cost = Column(Numeric(10, 2))  # Changed from Float to Numeric for precision
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response"""
        return {
            'flight_id': str(self.flight_id) if self.flight_id else None,
            'flight_number': self.flight_number,
            'airline': self.airline,
            'datetime_departure': self.datetime_departure.isoformat() if self.datetime_departure else None,
            'datetime_arrival': self.datetime_arrival.isoformat() if self.datetime_arrival else None,
            'external_link': self.external_link,
            'trip_id': str(self.trip_id) if self.trip_id else None,
            'cost': float(self.cost) if self.cost is not None else None,  # Convert Decimal to float for JSON
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
