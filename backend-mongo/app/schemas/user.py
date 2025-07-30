from pydantic import BaseModel
from datetime import datetime

class LoginData(BaseModel):
    email: str
    password: str

class RefreshTokenData(BaseModel):
    refresh_token: str

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    created_at: datetime