-- init.sql
-- 파일 관리 시스템 (최소 버전)

-- 사용자 테이블
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 폴더 테이블
CREATE TABLE folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 파일 테이블
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path_on_disk VARCHAR(500) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL,
    parent_folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 기본 인덱스
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX idx_files_parent ON files(parent_folder_id);

-- 성능 최적화 인덱스 추가
-- 1. 폴더 관련 인덱스
CREATE INDEX idx_folders_owner ON folders(owner_id);
CREATE INDEX idx_folders_owner_parent ON folders(owner_id, parent_folder_id);
CREATE INDEX idx_folders_created_at ON folders(created_at);

-- 2. 파일 관련 인덱스
CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_owner_parent ON files(owner_id, parent_folder_id);
CREATE INDEX idx_files_name ON files(name);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_size ON files(file_size);

-- 3. 사용자 관련 인덱스 (email은 이미 UNIQUE 제약조건으로 인덱스 생성됨)
CREATE INDEX idx_users_created_at ON users(created_at);

-- 4. 복합 인덱스 (자주 사용되는 쿼리 패턴용)
CREATE INDEX idx_folders_owner_parent_name ON folders(owner_id, parent_folder_id, name);
CREATE INDEX idx_files_owner_parent_name ON files(owner_id, parent_folder_id, name);

-- -- 샘플 데이터
-- INSERT INTO users (email, name) VALUES 
-- ('admin@example.com', 'Admin');

-- -- 루트에 위치 하는 폴더 (MyDrive)
-- INSERT INTO folders (name, parent_folder_id, owner_id) VALUES 
-- ('MyDrive', NULL, 1);

-- -- 예시 폴더
-- INSERT INTO folders (name, parent_folder_id, owner_id) VALUES 
-- ('학교과제', 1, 1),
-- ('3월보고서', 2, 1);

-- -- 예시 파일
-- INSERT INTO files (name, path_on_disk, file_size, parent_folder_id, owner_id) VALUES 
-- ('abc.pdf', '/data/files/uuid123abc.pdf', 1024000, 3, 1);