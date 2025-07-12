# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os

# 환경변수 또는 기본값
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://myapp_user:myapp_password@localhost:5432/myapp_db"
)

# 비동기 버전 (추천)
ASYNC_DATABASE_URL = os.getenv(
    "ASYNC_DATABASE_URL",
    "postgresql+asyncpg://myapp_user:myapp_password@localhost:5432/myapp_db"
)

# 동기 엔진 (마이그레이션용)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 비동기 엔진 (FastAPI용)
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

# Base 클래스 (모델 정의용)
Base = declarative_base()

# 의존성 주입용 함수 (동기)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 의존성 주입용 함수 (비동기)
async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session

# 데이터베이스 초기화
async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# 연결 테스트 함수
async def test_connection():
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False