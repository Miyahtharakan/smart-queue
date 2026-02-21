from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from datetime import datetime
from database import Base

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Counter(Base):
    __tablename__ = "counters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    avg_service_time = Column(Float, default=5.0)
    location_id = Column(Integer, ForeignKey("locations.id"))
    
from sqlalchemy import Enum
import enum

class TokenStatus(str, enum.Enum):
    waiting = "waiting"
    serving = "serving"
    completed = "completed"

class Token(Base):
    __tablename__ = "tokens"
    status = Column(String, default="waiting")
    created_at = Column(DateTime, default=datetime.utcnow)

    id = Column(Integer, primary_key=True, index=True)
    counter_id = Column(Integer, ForeignKey("counters.id"))
    status = Column(Enum(TokenStatus), default=TokenStatus.waiting)
    arrival_time = Column(DateTime, default=datetime.utcnow)