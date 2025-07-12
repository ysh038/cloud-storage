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

# 🏛️ 파일 시스템 아키텍처

### 📁 가상 디렉토리 vs 물리적 저장 분리

이 프로젝트는 **클라우드 스토리지** 방식을 채택하여, 사용자가 보는 가상 디렉토리 구조와 실제 파일 저장 방식을 분리했습니다.

#### 🎭 사용자가 보는 것 (가상 구조)

```
📁 내 드라이브
├── 📁 프로젝트
│   ├── 📄 document.pdf
│   └── 📁 이미지
│       ├── 📄 photo1.jpg
│       └── 📄 photo2.png
├── 📁 개인
│   └── 📄 resume.docx
└── 📄 readme.txt
```

#### 💾 실제 서버 저장 구조 (물리적)

```
data/files/
├── 1/                                    # 사용자 ID
│   └── 2025/
│       └── 01/
│           ├── a27acbb3-826e-4664-877d-5959110441d3.pdf
│           ├── b3f8c2d1-927f-4b65-988e-6a6b221d4f2e.jpg
│           ├── c9e4f1a2-038g-4c76-a99f-7b7c332e5g3f.png
│           ├── d2a5b3c4-149h-4d87-b00g-8c8d443f6h4g.docx
│           └── e6f9c7d8-25ai-4e98-c11h-9d9e554g7i5h.txt
├── 2/                                    # 다른 사용자 ID
│   └── 2025/
│       └── 01/
│           └── [다른 사용자의 파일들...]
└── 3/                                    # 또 다른 사용자 ID
    └── ...
```

#### 🗄️ 데이터베이스 구조

**folders 테이블** (가상 디렉토리 구조)
| id | name | parent_folder_id | owner_id |
|----|------|------------------|----------|
| 1 | 프로젝트 | NULL | 1 |
| 2 | 이미지 | 1 | 1 |
| 3 | 개인 | NULL | 1 |

**files 테이블** (파일 메타데이터)
| id | name | parent_folder_id | path_on_disk | owner_id |
|----|------|------------------|--------------|----------|
| 1 | document.pdf | 1 | data/files/1/2025/01/a27acbb3-826e-4664-877d-5959110441d3.pdf | 1 |
| 2 | photo1.jpg | 2 | data/files/1/2025/01/b3f8c2d1-927f-4b65-988e-6a6b221d4f2e.jpg | 1 |
| 3 | resume.docx | 3 | data/files/1/2025/01/d2a5b3c4-149h-4d87-b00g-8c8d443f6h4g.docx | 1 |

### 🔄 작동 원리

#### 📁 폴더 생성
1. 사용자가 "프로젝트" 폴더 생성
2. **물리적 폴더는 생성되지 않음**
3. DB에만 `parent_folder_id` 관계로 계층 구조 저장

#### 📄 파일 업로드
1. 사용자가 "프로젝트" 폴더에 `document.pdf` 업로드
2. **실제 저장**: `UUID + 확장자`로 고유한 파일명 생성
3. **물리적 경로**: `data/files/{사용자ID}/{년}/{월}/{UUID}.pdf`
4. **DB 저장**:
   - `name`: `document.pdf` (사용자가 보는 이름)
   - `parent_folder_id`: `1` (프로젝트 폴더 ID)
   - `path_on_disk`: 실제 물리적 경로

#### 📂 폴더 탐색
1. 사용자가 "프로젝트" 폴더 클릭
2. `parent_folder_id = 1`인 모든 파일/폴더 조회
3. 가상 디렉토리 구조로 표시

### ✨ 이 방식의 장점

#### 🚀 **성능 최적화**
- 물리적 디렉토리 깊이 제한 (OS 성능 이슈 방지)
- 파일 검색이 DB 인덱스로 빠름
- 대용량 파일 시스템에서도 안정적

#### 🔒 **보안 강화**
- 실제 파일 경로가 노출되지 않음
- UUID로 파일명 추측 불가능
- 사용자별 물리적 격리

#### 🛠️ **관리 용이성**
- 파일 중복 제거 가능 (동일 해시 시)
- 백업/복원 시 메타데이터와 파일 분리 관리
- 스토리지 마이그레이션 용이

#### 📈 **확장성**
- 여러 스토리지 서버로 분산 가능
- CDN 연동 용이
- 파일 버전 관리 구현 가능

### 🔍 구현 세부사항

#### 파일 업로드 과정
```python
# 1. 고유한 파일명 생성
unique_filename = f"{uuid.uuid4()}{file_extension}"

# 2. 물리적 저장 경로 생성 (년/월별 분류)
relative_path = Path("data/files") / str(owner_id) / str(now.year) / f"{now.month:02d}"
file_path = relative_path / unique_filename

# 3. DB에 메타데이터 저장
new_file = File(
    name=file.filename,           # 사용자가 보는 이름
    path_on_disk=str(file_path), # 실제 물리적 경로
    parent_folder_id=folder_id,   # 가상 폴더 구조
    owner_id=owner_id
)
```

#### 파일 다운로드 과정
```python
# 1. DB에서 파일 메타데이터 조회
file = await db.execute(select(File).where(File.id == file_id))

# 2. 실제 물리적 경로에서 파일 읽기
file_path = Path(file.path_on_disk)

# 3. 사용자에게는 원본 파일명으로 전송
return FileResponse(path=file_path, filename=file.name)
```

이 아키텍처는 **Google Drive, Dropbox, AWS S3** 등 주요 클라우드 스토리지 서비스들이 사용하는 방식과 동일합니다.

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
| `GET` | `/users/` | 전체 사용자 목록 조회(개발용) | ❌ |
| `POST` | `/users/` | 새 사용자 생성 | ❌ |
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
