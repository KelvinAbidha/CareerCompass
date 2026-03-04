from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class LogBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[str] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    tags: Optional[List[str]] = []

class LogCreate(LogBase):
    pass

class LogResponse(LogBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class MilestoneBase(BaseModel):
    title: str
    description: Optional[str] = None
    log_id: Optional[int] = None

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneResponse(MilestoneBase):
    id: int
    achieved_at: datetime

    class Config:
        from_attributes = True
