from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db
from sqlalchemy import select, func
from app.model.folder import Folder
from app.schemas.folder import FolderUpdate, FolderCreate
from typing import Optional
from fastapi import Header
from app.utilities.jwt import verify_token
from app.model.user import User
import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from sqlalchemy import text
from app.database import AsyncSessionLocal

router = APIRouter()

@router.get("/folders/")
async def get_folders(
    current_folder_id: Optional[int] = None,
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

    # 새로운 폴더 쿼리 생성
    folder_query = select(Folder).where(Folder.owner_id == user_id)

    if current_folder_id == 0 or current_folder_id is None:  # 0을 루트 폴더로 사용
        folder_query = folder_query.where(Folder.parent_folder_id.is_(None))
    else:
        folder_query = folder_query.where(Folder.parent_folder_id == current_folder_id)
    
    # 현재 폴더의 부모 폴더 찾기
    parent_folder_id_response = None
    if current_folder_id is not None:
        query = select(Folder).where(Folder.id == current_folder_id)
        result = await db.execute(query)
        folder = result.scalars().first()

        # folder가 존재하는지 확인
        if folder:
            parent_folder_id_response = folder.parent_folder_id
        else:
            parent_folder_id_response = 0

    result = await db.execute(folder_query)
    folders = result.scalars().all()

    return {
        "folders": folders,
        "parent_folder_id": parent_folder_id_response
    }

@router.post("/folders/")
async def create_folder(
    folder: FolderCreate,
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
    owner_id = user.id

    parent_id = None if folder.parent_folder_id == 0 else folder.parent_folder_id

    new_folder = Folder(
        name=folder.name,
        parent_folder_id=parent_id,
        owner_id=owner_id,
        created_at=func.now()
    )
    db.add(new_folder)
    await db.commit()
    await db.refresh(new_folder)
    return {"message": "Folder created successfully"}

@router.patch("/folders/{folder_id}")
async def update_folder(
    folder_id: int,
    update_data: FolderUpdate,
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

    query = select(Folder).where(Folder.id == folder_id)
    result = await db.execute(query)
    folder = result.scalars().first()

    if folder.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    if update_data.name is not None:
        folder.name = update_data.name

    if update_data.parent_folder_id is not None:
        # parent_folder_id가 0이면 NULL로 변환
        folder.parent_folder_id = None if update_data.parent_folder_id == 0 else update_data.parent_folder_id
    
    await db.commit()
    return {"message": "Folder updated successfully"}

@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
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
    
    # 폴더 조회
    folder_query = select(Folder).where(Folder.id == folder_id)
    result = await db.execute(folder_query)
    folder = result.scalars().first()
    
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # 폴더 소유자 확인
    if folder.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. 먼저 파일 경로들 조회
    file_paths = await get_files_to_delete(db, folder_id)
    
    # DB에서 폴더 정보 삭제
    await db.delete(folder)
    await db.commit()

    # 3. 백그라운드에서 파일 삭제
    if file_paths:
        asyncio.create_task(cleanup_files_background(file_paths))
    else:
        print("No files to cleanup")

    return {"message": "Folder deleted successfully"}

async def get_files_to_delete(db: AsyncSession, folder_id: int):
    """삭제할 파일 경로들을 조회"""
    query = text("""
        WITH RECURSIVE subfolder_tree AS (
            SELECT id FROM folders WHERE id = :folder_id
            UNION ALL
            SELECT f.id FROM folders f
            INNER JOIN subfolder_tree st ON f.parent_folder_id = st.id
        )
        SELECT path_on_disk FROM files 
        WHERE parent_folder_id IN (SELECT id FROM subfolder_tree)
    """)
    
    result = await db.execute(query, {"folder_id": folder_id})
    file_paths = [row[0] for row in result.fetchall()]
    return file_paths

async def cleanup_files_background(file_paths: list):
    """백그라운드에서 실제 파일들을 삭제"""
    print(f"Background cleanup started for {len(file_paths)} files")
    
    try:
        deleted_count = 0
        for file_path in file_paths:
            try:
                Path(file_path).unlink(missing_ok=True)
                deleted_count += 1
                print(f"Deleted file: {file_path}")
            except Exception as e:
                print(f"Failed to delete {file_path}: {e}")
        
        print(f"Background cleanup completed. Deleted {deleted_count}/{len(file_paths)} files")
        
    except Exception as e:
        print(f"Background cleanup failed: {e}")