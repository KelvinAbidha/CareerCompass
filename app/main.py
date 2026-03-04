from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.core.router import router as core_router
from app.notifications.router import router as notif_router

# Create DB schema
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Career Compass API")

app.include_router(core_router, prefix="/api")
app.include_router(notif_router, prefix="/api")

# Mount the static directory to serve frontend files
app.mount("/", StaticFiles(directory="static", html=True), name="static")
