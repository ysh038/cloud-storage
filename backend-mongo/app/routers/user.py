from fastapi import APIRouter, HTTPException, Depends
from app.database import get_database
from pymongo.database import Database
from app.schemas.user import LoginData, RefreshTokenData, UserCreate
import bcrypt
from app.utilities.jwt import create_access_token, create_refresh_token, verify_access_token, verify_refresh_token, verify_token
from app.utilities.auth import get_user_id

router = APIRouter()

@router.get("/users")
async def get_users(db: Database = Depends(get_database)):
    try:
        users = list(db.users.find({}, {"password": 0}))  # 비밀번호 제외
        # ObjectId를 문자열로 변환
        for user in users:
            user["_id"] = str(user["_id"])
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/users/{user_id}")
async def get_user(user_id: str, db: Database = Depends(get_database)):
    try:
        from bson import ObjectId
        user = db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user["_id"] = str(user["_id"])
        return {"user": user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.post("/users/")
async def create_user(user_data: UserCreate, db: Database = Depends(get_database)):
    try:
        # hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        # user_data.password = hashed_password

        user = db.users.insert_one(user_data.model_dump())
        return {"message": "User created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# 로그인
@router.post("/login/")
async def login(
    login_data: LoginData,
    db: Database = Depends(get_database)
):
    print(f"로그인 시도 이메일: {login_data.email}")  # 디버깅용 로그
    # email로 사용자 조회 (select 사용)
    user = db.users.find_one({"email": login_data.email})
    print(f"로그인 시도 이메일: {login_data.email}")  # 디버깅용 로그

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not bcrypt.checkpw(
        login_data.password.encode('utf-8'), 
        user["password"].encode('utf-8')
    ):
        raise HTTPException(status_code=401, detail="Invalid password")

    access_token = create_access_token(
        data={"email": user["email"], "name": user["name"]}
    )
    refresh_token = create_refresh_token(
        data={"email": user["email"], "name": user["name"]}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "email": user["email"],
            "name": user["name"]
        }
    }

# Refresh Token으로 새로운 Access Token 발급
@router.post("/refresh/")
async def refresh_access_token(
    refresh_data: RefreshTokenData,
    db: Database = Depends(get_database)
):
    # Refresh Token 검증
    payload = verify_refresh_token(refresh_data.refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    # 사용자 정보 확인
    user_email = payload.get("email")
    user = db.users.find_one({"email": user_email})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 새로운 Access Token 생성
    token_data = {"email": user["email"], "name": user["name"]}
    new_access_token = create_access_token(data=token_data)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }