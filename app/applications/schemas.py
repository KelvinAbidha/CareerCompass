from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JobApplicationBase(BaseModel):
    company_name: str
    role: str
    status: str = "Applied"
    date_applied: Optional[str] = None
    notes: Optional[str] = None

class JobApplicationCreate(JobApplicationBase):
    pass

class JobApplicationUpdate(BaseModel):
    company_name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    date_applied: Optional[str] = None
    notes: Optional[str] = None

class JobApplicationResponse(JobApplicationBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True
