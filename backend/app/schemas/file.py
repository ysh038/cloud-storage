from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from fastapi import UploadFile
from fastapi.datastructures import UploadFile

class FileBase(BaseModel):
    name: str
    file_size: int
    parent_folder_id: Optional[int] = None

class FileUpdate(BaseModel):
    name: Optional[str] = None
    parent_folder_id: Optional[int] = None

class FileResponse(FileBase):
    id: int
    path_on_disk: str
    owner_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True