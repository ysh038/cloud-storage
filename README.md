# CMS Test Project

파일 관리 시스템 (Content Management System) 프로젝트

## 🏗️ 프로젝트 구조

```
cms-test/
├── frontend/ # React 프론트엔드
├── backend/ # FastAPI 백엔드
├── db/ # PostgreSQL Docker 환경
└── README.md
```

## 🚀 기술 스택

### Frontend
- React + TypeScript
- Vite
- CSS Modules

### Backend
- FastAPI
- SQLAlchemy (Async)
- PostgreSQL

### Database
- PostgreSQL 15
- pgAdmin 4

## ⚡ 빠른 시작

### 1. 데이터베이스 실행
```bash
cd db
docker-compose up -d
```

### 2. 백엔드 실행
```bash
cd backend
conda activate cms-test  # 또는 가상환경 활성화
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 3. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

## 🌐 접속 정보

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | `http://localhost:5173` | React 개발 서버 |
| Backend API | `http://localhost:8000` | FastAPI 서버 |
| API Docs | `http://localhost:8000/docs` | Swagger UI |
| Database Admin | `http://localhost:8080` | pgAdmin |

## 🗄️ 데이터베이스 접속

### PostgreSQL
- Host: `localhost:5432`
- Database: `myapp_db`
- Username: `myapp_user`
- Password: `myapp_password`

### pgAdmin
- URL: `http://localhost:8080`
- Email: `admin@admin.com`
- Password: `admin`

## 🛠️ 개발 명령어

### 전체 환경 시작
```bash
# 1. 데이터베이스
cd db && docker-compose up -d

# 2. 백엔드 (새 터미널)
cd backend && uvicorn app.main:app --reload

# 3. 프론트엔드 (새 터미널)
cd frontend && npm run dev
```

### 개별 서비스 관리

#### Database
```bash
cd db
docker-compose up -d    # 시작
docker-compose down     # 중지
docker-compose logs -f  # 로그 확인
```

#### Backend
```bash
cd backend
uvicorn app.main:app --reload           # 개발 서버
```

#### Frontend
```bash
cd frontend
npm run dev         # 개발 서버
npm run build       # 빌드
```

## 📁 주요 기능

- 📂 **폴더 관리**: 계층형 폴더 구조
- 📄 **파일 업로드/다운로드**: 파일 메타데이터 관리
- 👥 **사용자 관리**: 사용자별 파일 소유권
- 🔍 **API 문서**: Swagger UI 제공


## 📚 API 문서

### 🔐 사용자 관리 (User)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| `GET` | `/users/` | 사용자 목록 조회 | ❌ |
| `POST` | `/users/` | 새 사용자 생성 | ❌ |
| `PATCH` | `/users/` | 사용자 정보 수정 | ❌ |
| `POST` | `/login/` | 로그인 (JWT 토큰 발급) | ❌ |
| `POST` | `/refresh/` | 액세스 토큰 갱신 | ❌ |

#### 로그인 응답 예시
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "email": "user@example.com",
    "name": "사용자명"
  }
}
```

### 📁 폴더 관리 (Folder)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| `GET` | `/folders/` | 폴더 목록 조회 | ✅ |
| `POST` | `/folders/` | 새 폴더 생성 | ✅ |
| `PATCH` | `/folders/{folder_id}` | 폴더 정보 수정 | ✅ |
| `DELETE` | `/folders/{folder_id}` | 폴더 삭제 (하위 항목 포함) | ✅ |

#### 폴더 조회 쿼리 파라미터
- `current_folder_id`: 현재 폴더 ID (0 또는 null = 루트 폴더)

### 📄 파일 관리 (File)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| `GET` | `/files/` | 파일 목록 조회 | ✅ |
| `POST` | `/files/` | 파일 업로드 | ✅ |
| `GET` | `/files/download/{file_id}` | 파일 다운로드 | ✅ |
| `PATCH` | `/files/{file_id}` | 파일 정보 수정 | ✅ |
| `DELETE` | `/files/{file_id}` | 파일 삭제 | ✅ |

#### 파일 조회 쿼리 파라미터
- `parent_folder_id`: 상위 폴더 ID (0 또는 null = 루트 폴더)

#### 파일 업로드 Form Data
- `file`: 업로드할 파일
- `parent_folder_id`: 상위 폴더 ID

### 🔑 인증 방식

모든 인증이 필요한 API는 다음 헤더를 포함해야 합니다:

>Authorization: Bearer {access_token}

### 📝 API 사용 예시

#### 1. 사용자 생성 및 로그인
```bash
# 사용자 생성
curl -X POST "http://localhost:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "테스트", "password": "password123"}'

# 로그인
curl -X POST "http://localhost:8000/login/" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

#### 2. 폴더 생성
```bash
curl -X POST "http://localhost:8000/folders/" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "새 폴더", "parent_folder_id": 0}'
```

#### 3. 파일 업로드
```bash
curl -X POST "http://localhost:8000/files/" \
  -H "Authorization: Bearer {access_token}" \
  -F "file=@example.txt" \
  -F "parent_folder_id=0"
```

#### 4. 파일 목록 조회
```bash
curl -X GET "http://localhost:8000/files/?parent_folder_id=0" \
  -H "Authorization: Bearer {access_token}"
```


## 📦 요구사항

### System
- Node.js 18+
- Python 3.10+
- Docker & Docker Compose

### Python Environment
```bash
conda create --name cms-test python=3.10
conda activate cms-test
```


## 🤝 개발 가이드

1. **새 기능 개발**:
   - Backend: `backend/app/routers/` 에 라우터 추가
   - Frontend: `frontend/src/components/` 에 컴포넌트 추가

2. **데이터베이스 스키마 변경**:
   - `db/init.sql` 수정
   - `backend/app/models/` 모델 업데이트 (ORM)

3. **API 테스트**:
   - Swagger UI: `http://localhost:8000/docs`
   - curl 예시: `curl http://localhost:8000/users/`
