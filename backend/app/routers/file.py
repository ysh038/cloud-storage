from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db
from sqlalchemy import select
from app.model.file import File
from app.schemas.file import FileUpdate
from datetime import datetime
import uuid
from pathlib import Path
from fastapi import UploadFile, Form
from fastapi import File as FastAPIFile
from typing import Optional
from app.utilities.jwt import verify_token
from fastapi import Header
from app.model.user import User
from fastapi.responses import FileResponse
import mimetypes

router = APIRouter()

@router.get("/files/")
async def get_files(
    parent_folder_id: Optional[int] = None,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    payload_user_email = payload.get("email")
    query = select(User).where(User.email == payload_user_email)
    result = await db.execute(query)
    user = result.scalars().first()
    user_id = user.id

    file_query = select(File).where(File.owner_id == user_id)
    
    if parent_folder_id == 0 or parent_folder_id is None:  # 0을 루트 폴더로 사용
        file_query = file_query.where(File.parent_folder_id.is_(None))
    else:
        file_query = file_query.where(File.parent_folder_id == parent_folder_id)
    
    result = await db.execute(file_query)
    files = result.scalars().all()
    return files

@router.post("/files/")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    parent_folder_id: int = Form(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid token format")
    
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        if not payload:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        payload_user_email = payload.get("email")
        query = select(User).where(User.email == payload_user_email)
        result = await db.execute(query)
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        owner_id = user.id

         # 파일명 검증
        if not file.filename:
            raise HTTPException(status_code=400, detail="Filename is required")

        # 파일 확장자 추출
        file_extension = Path(file.filename).suffix if file.filename else ""
        
        # 고유한 파일명 생성 (UUID + 확장자)
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # 저장 경로 생성 (data/files/owner_id/년/월/)
        now = datetime.now()
        relative_path = Path("data/files") / str(owner_id) / str(now.year) / f"{now.month:02d}"
        file_path = relative_path / unique_filename
        
        # 디렉토리 생성
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 파일 저장
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # 파일 크기 계산
        file_size = len(content)

        # parent_folder_id 처리 수정
        actual_parent_folder_id = None if parent_folder_id == 0 else parent_folder_id
        
        # 데이터베이스에 파일 정보 저장
        new_file = File(
            name=file.filename,
            path_on_disk=str(file_path),
            file_size=file_size,
            parent_folder_id=actual_parent_folder_id,
            owner_id=owner_id,
            created_at=datetime.now()
        )
        
        db.add(new_file)
        await db.commit()
        await db.refresh(new_file)
        
        return {
            "message": "File uploaded successfully",
            "file": {
                "id": new_file.id,
                "name": new_file.name,
                "file_size": new_file.file_size,
                "path_on_disk": new_file.path_on_disk,
                "parent_folder_id": actual_parent_folder_id,
                "owner_id": new_file.owner_id,
                "created_at": new_file.created_at.isoformat() if new_file.created_at else None
            }
        }
        
    except HTTPException:
        # HTTPException은 다시 raise
        raise
    except Exception as e:
        await db.rollback()
        # 업로드 실패 시 파일 삭제
        if file_path and file_path.exists():
            try:
                file_path.unlink()
            except:
                pass  # 파일 삭제 실패는 무시
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

@router.get("/files/download/{file_id}")
async def download_file(
    file_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    file_query = select(File).where(File.id == file_id)
    result = await db.execute(file_query)
    file = result.scalars().first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = Path(file.path_on_disk)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    mime_type, _ = mimetypes.guess_type(file.name)
    if mime_type is None:
        mime_type = "application/octet-stream"
    
    return FileResponse(
        path=file_path,
        filename=file.name,
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename={file.name}",
        "X-Filename": file.name}
    )

@router.patch("/files/{file_id}")
async def update_file(
    file_id: int,
    update_data: FileUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    payload_user_email = payload.get("email")
    query = select(User).where(User.email == payload_user_email)
    result = await db.execute(query)
    user = result.scalars().first()

    query = select(File).where(File.id == file_id)
    result = await db.execute(query)
    file = result.scalars().first()

    if file.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if update_data.name is not None:
        # 기존 파일의 확장자 추출
        original_extension = Path(file.name).suffix
        
        # 새 파일명에서 확장자 제거 (있다면)
        new_name_without_ext = Path(update_data.name).stem
        
        # 기존 확장자와 함께 새 파일명 생성
        file.name = f"{new_name_without_ext}{original_extension}"
    
    
    if update_data.parent_folder_id is not None:
        # parent_folder_id가 0이면 NULL로 변환
        file.parent_folder_id = None if update_data.parent_folder_id == 0 else update_data.parent_folder_id
    
    # if update_data.file_size is not None:
    #     file.file_size = update_data.file_size
    
    # if update_data.owner_id is not None:
    #     file.owner_id = update_data.owner_id
    
    await db.commit()
    return {"message": "File updated successfully"}

@router.delete("/files/{file_id}")
async def delete_file(
    file_id: int,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_async_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    token = authorization.replace("Bearer ", "")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    # 사용자 확인
    payload_user_email = payload.get("email")
    user_query = select(User).where(User.email == payload_user_email)
    user_result = await db.execute(user_query)
    user = user_result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 파일 조회
    file_query = select(File).where(File.id == file_id)
    result = await db.execute(file_query)
    file = result.scalars().first()
    
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # 파일 소유자 확인
    if file.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # 실제 파일 삭제
    file_path = Path(file.path_on_disk)
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            print(f"Failed to delete file from disk: {e}")
    
    # DB에서 파일 정보 삭제
    await db.delete(file)
    await db.commit()
    