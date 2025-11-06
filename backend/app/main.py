from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.config import settings
from app.core.database import SessionLocal
from app.api import auth, attendance, students, classes, facial_recognition
from app.services.cleanup import cleanup_service
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()


def run_cleanup_job():
    """Background job to clean up old attendance records."""
    db = SessionLocal()
    try:
        logger.info("Starting scheduled attendance cleanup...")
        result = cleanup_service.cleanup_old_attendance(db, months=6)
        logger.info(f"Cleanup completed: {result}")
    except Exception as e:
        logger.error(f"Error in cleanup job: {str(e)}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events (startup/shutdown)."""
    # Startup: Schedule daily cleanup at 2 AM
    scheduler.add_job(
        run_cleanup_job,
        trigger=CronTrigger(hour=2, minute=0),  # Run daily at 2:00 AM
        id='daily_attendance_cleanup',
        name='Daily Attendance Cleanup (6 months retention)',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Background scheduler started. Daily cleanup scheduled at 2:00 AM")
    yield
    # Shutdown: Stop scheduler
    scheduler.shutdown()
    logger.info("Background scheduler stopped")

# Create FastAPI app with lifespan events
app = FastAPI(
    title=settings.APP_NAME,
    description="Automated Attendance System using Facial Recognition",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(students.router)
app.include_router(classes.router)
app.include_router(facial_recognition.router)

# Mount static files for uploaded photos
uploads_dir = "uploads"
if not os.path.exists(uploads_dir):
    os.makedirs(uploads_dir)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Welcome to AutoAttend API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)

