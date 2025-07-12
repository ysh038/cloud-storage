
## 🛠️ 설치 및 실행

### 1. 가상환경 설정 (conda)
```bash
conda create --name cms-test python=3.10
conda activate cms-test
```

### 2. 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. 데이터베이스 실행
```bash
# db 디렉토리로 이동
cd ../db
docker-compose up -d
```

### 4. 백엔드 서버 실행
```bash
# backend 디렉토리에서
uvicorn app.main:app --reload
```

## 🌐 API 엔드포인트

### 기본 정보
- **Base URL**: `http://localhost:8000`
- **API 문서**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 사용자 관리
- `GET /users/` - 사용자 목록 조회

### 파일 관리
- `GET /files/` - 파일 목록 조회

### 폴더 관리
- `GET /folders/` - 폴더 목록 조회

## 🗄️ 데이터베이스

### 연결 정보
- **Host**: localhost
- **Port**: 5432
- **Database**: myapp_db
- **Username**: myapp_user
- **Password**: myapp_password

### 테이블 구조
- `users`: 사용자 정보
- `folders`: 폴더 계층 구조
- `files`: 파일 메타데이터

## 🔧 개발 도구

### API 테스트
```bash
# 사용자 목록 조회
curl http://localhost:8000/users/

# 또는 브라우저에서
http://localhost:8000/docs
```

### 데이터베이스 관리
- **pgAdmin**: `http://localhost:8080`
- **로그인**: admin@admin.com / admin

## 📦 주요 패키지

```txt
fastapi==0.104.1
sqlalchemy[asyncio]==2.0.23
asyncpg==0.29.0
psycopg2-binary==2.9.9
uvicorn[standard]==0.24.0
python-dotenv==1.0.0
```

## 📝 개발 가이드

### 새로운 API 추가
1. `models/` 에 데이터 모델 정의
2. `routers/` 에 라우터 생성
3. `main.py` 에 라우터 등록

### 데이터베이스 스키마 변경
1. `models/` 수정
2. 서버 재시작 (개발 환경에서는 자동 생성)
