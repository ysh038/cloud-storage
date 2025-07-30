from pydantic import BaseModel
from typing import Optional

class FileCreate(BaseModel):
    name: str
    parent_folder_id: str
    owner_id: str
    email: str
    file_size: int
    path_on_disk: str

class FileUpdate(BaseModel):
    name: Optional[str] = None
    parent_folder_id: Optional[str] = None

class FileDownload(BaseModel):
    file_id: str
    authorization: str