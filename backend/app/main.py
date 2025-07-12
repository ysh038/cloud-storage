# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, test_connection
from app.routers import user
from app.routers import file
from app.routers import folder

app = FastAPI()

# CORS 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
    expose_headers=["Content-Disposition", "X-Filename"]  # 추가!
)

app.include_router(user.router)
app.include_router(file.router)
app.include_router(folder.router)

@app.on_event("startup")
async def startup_event():
    await init_db()
    await test_connection()

@app.get("/")
async def root():
    return {"message": "Hello World"}