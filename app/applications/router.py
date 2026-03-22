from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.core import models
from app.applications import schemas
from app.events import emit

router = APIRouter()

@router.post("/", response_model=schemas.JobApplicationResponse)
async def create_application(application: schemas.JobApplicationCreate, db: Session = Depends(get_db)):
    db_app = models.JobApplication(**application.model_dump())
    db.add(db_app)
    db.commit()
    db.refresh(db_app)
    
    # Fire an event so the live feed hears about "Someone applied to a job!"
    await emit("activity_logged", {"type": "log_created", "data": {"title": f"Applied to {db_app.company_name}", "description": f"Role: {db_app.role}", "timestamp": db_app.timestamp.isoformat()}})
    
    return db_app

@router.get("/", response_model=List[schemas.JobApplicationResponse])
def get_applications(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    applications = db.query(models.JobApplication).order_by(models.JobApplication.timestamp.desc()).offset(skip).limit(limit).all()
    return applications

@router.put("/{app_id}", response_model=schemas.JobApplicationResponse)
def update_application(app_id: int, application: schemas.JobApplicationUpdate, db: Session = Depends(get_db)):
    db_app = db.query(models.JobApplication).filter(models.JobApplication.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    update_data = application.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_app, key, value)
        
    db.commit()
    db.refresh(db_app)
    return db_app

@router.delete("/{app_id}")
def delete_application(app_id: int, db: Session = Depends(get_db)):
    db_app = db.query(models.JobApplication).filter(models.JobApplication.id == app_id).first()
    if not db_app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(db_app)
    db.commit()
    return {"ok": True}
