# app/schemas/user.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    password: str
    created_at: datetime
    
    class Config:
        from_attributes = True  # SQLAlchemy 모델 변환 허용

class UserCreate(BaseModel):
    email: str
    name: str
    password: str

class UserUpdate(BaseModel):
    id: int
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class LoginData(BaseModel):
    email: str
    password: str

class RefreshTokenData(BaseModel):
    refresh_token: str