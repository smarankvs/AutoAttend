from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import Field, field_validator


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AutoAttend"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - can be comma-separated string or list
    ALLOWED_ORIGINS: str | List[str] = "http://localhost:3000"
    
    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Facial Recognition
    FACES_DIR: str = "faces"
    RECOGNITION_TOLERANCE: float = 0.6
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

