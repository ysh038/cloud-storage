from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_async_db
from sqlalchemy import select
from app.model.user import User
from app.schemas.user import UserCreate, UserUpdate, LoginData, RefreshTokenData
import os
import asyncio
from pathlib import Path
from app.utilities.jwt import create_access_token, create_refresh_token, verify_access_token, verify_refresh_token, verify_token
import bcrypt

router = APIRouter()

# 유저 목록 받아오기
@router.get("/users/")
async def get_users(db: AsyncSession = Depends(get_async_db)):
    # DB 쿼리 실행
    result = await db.execute(select(User))
    users = result.scalars().all()
    return users

# 유저 생성
@router.post("/users/")
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_async_db)
):
    try:
        new_user = User(
            email=user.email,
            name=user.name,
            password=user.password
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)  # 생성된 사용자 ID 가져오기

        # 현재 작업 디렉토리 기준 상대 경로 사용
        base_path = Path("data/files")
        user_folder_path = base_path / str(new_user.id)
        
        # 비동기적으로 폴더 생성
        def create_user_folder():
            os.makedirs(user_folder_path, exist_ok=True)
            print(f"User folder created: {user_folder_path}")
        
        # 별도 스레드에서 폴더 생성 (파일 시스템 작업은 블로킹이므로)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, create_user_folder)
        
        return {
            "message": "User created successfully",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "name": new_user.name,
                "password": new_user.password,
                "created_at": new_user.created_at.isoformat() if new_user.created_at else None
            },
            "folder_path": user_folder_path
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

# 유저 정보 수정
@router.patch("/users/")
async def update_user(
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    user = await db.get(User, update_data.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if update_data.name is not None:
        user.name = update_data.name
    
    if update_data.email is not None:
        user.email = update_data.email

    if update_data.password is not None:
        user.password = update_data.password

    await db.commit()
    return {"message": "User updated successfully"}

# 로그인
@router.post("/login/")
async def login(
    login_data: LoginData,
    db: AsyncSession = Depends(get_async_db)
):
    # email로 사용자 조회 (select 사용)
    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not bcrypt.checkpw(
        login_data.password.encode('utf-8'), 
        user.password.encode('utf-8')
    ):
        raise HTTPException(status_code=401, detail="Invalid password")

    access_token = create_access_token(
        data={"email": user.email, "name": user.name}
    )
    refresh_token = create_refresh_token(
        data={"email": user.email, "name": user.name}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name
        }
    }

# Refresh Token으로 새로운 Access Token 발급
@router.post("/refresh/")
async def refresh_access_token(
    refresh_data: RefreshTokenData,
    db: AsyncSession = Depends(get_async_db)
):
    # Refresh Token 검증
    payload = verify_refresh_token(refresh_data.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    # 사용자 정보 확인
    user_email = payload.get("email")
    result = await db.execute(
        select(User).where(User.email == user_email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 새로운 Access Token 생성
    token_data = {"email": user.email, "name": user.name}
    new_access_token = create_access_token(data=token_data)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }