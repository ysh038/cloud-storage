from pydantic import BaseModel, Field, validator
from typing import Optional
from bson import ObjectId

class FolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="폴더명")
    # owner_id: str = Field(..., description="소유자 ID (ObjectId 형식)")
    parent_folder_id: Optional[str] = Field(None, description="부모 폴더 ID (선택사항)")
    
    @validator('parent_folder_id', pre=True)
    def convert_parent_folder_id(cls, v):
        # 0이나 "0"은 None으로 처리
        if v == 0 or v == "0" or v == "":
            return None
        # 숫자면 문자열로 변환
        if isinstance(v, int):
            return str(v)
        return v
    
class FolderPatch(BaseModel):
    name: Optional[str] = None
    parent_folder_id: Optional[str] = None