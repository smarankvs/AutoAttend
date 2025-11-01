from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, attendance, students, classes, facial_recognition

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Automated Attendance System using Facial Recognition",
    version="1.0.0"
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

