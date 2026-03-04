from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
import datetime
from app.database import Base

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(String, nullable=True) # Storing as YYYY-MM-DD
    image_url = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    achieved_at = Column(DateTime, default=datetime.datetime.utcnow)
    log_id = Column(Integer, nullable=True) # Optional link to a specific log 
