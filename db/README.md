
## 🚀 빠른 시작

### 1. 컨테이너 시작
```bash
cd db
docker-compose up -d
```

### 2. 상태 확인
```bash
docker-compose ps
```

### 3. 로그 확인
```bash
docker-compose logs -f
```

## 🔗 접속 정보

### PostgreSQL
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `myapp_db`
- **Username**: `myapp_user`
- **Password**: `myapp_password`

### pgAdmin (웹 관리도구)
- **URL**: `http://localhost:8080`
- **Email**: `admin@admin.com`
- **Password**: `admin`

## 🗄️ 데이터베이스 스키마

### 테이블 구조

#### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | 기본키 |
| email | VARCHAR(255) | 이메일 (유니크) |
| name | VARCHAR(100) | 사용자명 |
| created_at | TIMESTAMP | 생성일시 |

#### folders
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | 기본키 |
| name | VARCHAR(255) | 폴더명 |
| parent_folder_id | INTEGER | 상위 폴더 ID |
| owner_id | INTEGER | 소유자 ID |
| created_at | TIMESTAMP | 생성일시 |

#### files
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL | 기본키 |
| name | VARCHAR(255) | 파일명 |
| path_on_disk | VARCHAR(500) | 실제 저장 경로 |
| file_size | BIGINT | 파일 크기 |
| parent_folder_id | INTEGER | 상위 폴더 ID |
| owner_id | INTEGER | 소유자 ID |
| created_at | TIMESTAMP | 생성일시 |

## 🛠️ 관리 명령어

### 컨테이너 관리
```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 재시작
docker-compose restart

# 로그 보기
docker-compose logs postgres
docker-compose logs pgadmin
```

### 데이터 관리
```bash
# 데이터 유지하며 중지
docker-compose down

# 데이터까지 완전 삭제 (주의!)
docker-compose down -v
```

### 볼륨 관리
```bash
# 볼륨 목록 확인
docker volume ls

# 볼륨 상세 정보
docker volume inspect db_postgres_data
```

## 🔧 pgAdmin 서버 등록

1. **pgAdmin 접속**: `http://localhost:8080`
2. **로그인**: `admin@admin.com` / `admin`
3. **서버 등록**:
   - **General 탭**: Name = `PostgreSQL`
   - **Connection 탭**:
     - Host name/address: `postgres`
     - Port: `5432`
     - Username: `myapp_user`
     - Password: `myapp_password`

## 📊 샘플 데이터

초기 데이터가 자동으로 생성됩니다:

```sql
-- 사용자
INSERT INTO users (email, name) VALUES 
('user@example.com', '홍길동');

-- 폴더 구조
MyDrive (루트)
└── 학교과제
    └── 3월보고서
        └── abc.pdf
```

## 🔍 데이터 확인

### SQL 쿼리 예시
```sql
-- 모든 사용자 조회
SELECT * FROM users;

-- 폴더 계층 구조 조회
SELECT f.id, f.name, p.name as parent_name 
FROM folders f 
LEFT JOIN folders p ON f.parent_folder_id = p.id;

-- 파일 목록 조회
SELECT f.name, fo.name as folder_name, u.name as owner_name
FROM files f
JOIN folders fo ON f.parent_folder_id = fo.id
JOIN users u ON f.owner_id = u.id;
```