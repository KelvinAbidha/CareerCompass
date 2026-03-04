from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json

from app.database import get_db
from app.core import models, schemas
from app.events import emit

router = APIRouter(
    prefix="/logs",
    tags=["logs"],
)

@router.get("/", response_model=List[schemas.LogResponse])
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(models.Log).all()
    return logs

@router.post("/", response_model=schemas.LogResponse, status_code=status.HTTP_201_CREATED)
async def create_log(log: schemas.LogCreate, db: Session = Depends(get_db)):
    db_log = models.Log(
        title=log.title,
        description=log.description,
        date=log.date,
        image_url=log.image_url,
        tags=log.tags,
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    
    # Emit an internal event with the log data
    log_data = schemas.LogResponse.model_validate(db_log).model_dump()
    # Serialize datetime to string to send over SSE
    log_data['timestamp'] = log_data['timestamp'].isoformat()
    await emit("activity_logged", {"type": "log_created", "data": log_data})
    
    return db_log
