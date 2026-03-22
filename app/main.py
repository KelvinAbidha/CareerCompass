from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.core.router import router as core_router
from app.notifications.router import router as notif_router
from app.social.router import router as social_router
from app.applications.router import router as applications_router

# Create DB schema
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Career Compass API")

app.include_router(core_router, prefix="/api")
app.include_router(notif_router, prefix="/api")
app.include_router(social_router, prefix="/api")
app.include_router(applications_router, prefix="/api/applications")

# Mount the static directory to serve frontend files with no cache for dev
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

class NoCacheStaticFiles(StaticFiles):
    def is_not_modified(self, response_headers, request_headers) -> bool:
        return False
    
    def file_response(self, *args, **kwargs) -> FileResponse:
        resp = super().file_response(*args, **kwargs)
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        resp.headers["Pragma"] = "no-cache"
        resp.headers["Expires"] = "0"
        return resp

app.mount("/", NoCacheStaticFiles(directory="static", html=True), name="static")
