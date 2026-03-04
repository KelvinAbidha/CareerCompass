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

@router.get("", response_model=List[schemas.LogResponse])
@router.get("/", response_model=List[schemas.LogResponse], include_in_schema=False)
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(models.Log).all()
    return logs

@router.post("", response_model=schemas.LogResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.LogResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
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

@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.Log).filter(models.Log.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    
    db.delete(log)
    db.commit()
    
    # Emit deleted event if needed
    # await emit("activity_logged", {"type": "log_deleted", "data": {"id": log_id}})
    return None

@router.post("/{log_id}", response_model=schemas.LogResponse)
async def update_log(log_id: int, log_update: schemas.LogCreate, db: Session = Depends(get_db)):
    log = db.query(models.Log).filter(models.Log.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
        
    log.title = log_update.title
    log.description = log_update.description
    log.image_url = log_update.image_url
    log.tags = log_update.tags
    if log_update.date:
        log.date = log_update.date
        
    db.commit()
    db.refresh(log)
    
    # Emit an internal event with the log data
    log_data = schemas.LogResponse.model_validate(log).model_dump()
    log_data['timestamp'] = log_data['timestamp'].isoformat()
    await emit("activity_logged", {"type": "log_updated", "data": log_data})
    
    return log
