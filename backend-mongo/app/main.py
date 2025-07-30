from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import connect_to_mongodb, close_database
from app.routers import user, folder, file
from fastapi.middleware.cors import CORSMiddleware

# 애플리케이션 시작/종료 시 실행되는 함수
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시
    client, db = connect_to_mongodb()
    if not client:
        raise Exception("MongoDB 연결 실패")
    
    yield
    
    # 종료 시
    close_database()

# FastAPI 앱 생성
app = FastAPI(
    title="CMS API",
    description="Content Management System API",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost",  # 허용할 출처
    "http://localhost:5173",  # 프론트엔드가 실행되는 주소
    "http://192.168.1.163:5173",
    # 추가적인 출처를 여기에 추가
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
    expose_headers=["Content-Disposition"]  # 이 줄 추가
)

# 라우터 등록
app.include_router(user.router, tags=["users"])
app.include_router(folder.router, tags=["folders"])
app.include_router(file.router, tags=["files"])

@app.get("/")
async def root():
    return {"message": "CMS API is running"}

@app.get("/health")
async def health_check():
    from app.database import get_database
    try:
        db = get_database()
        # MongoDB 연결 상태 확인
        db.client.admin.command('ping')
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}