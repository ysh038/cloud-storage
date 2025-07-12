from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class FolderBase(BaseModel):
    name: str
    parent_folder_id: Optional[int] = None

class FolderCreate(FolderBase):
    parent_folder_id: Optional[int] = None
    name: str

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_folder_id: Optional[int] = None

class FolderResponse(FolderBase):
    id: int
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True