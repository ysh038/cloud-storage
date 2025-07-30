// init-mongo.js
// 파일 관리 시스템 (최소 버전) - MongoDB 초기화 스크립트

// 데이터베이스 연결
db = db.getSiblingDB('cms_db');

// 애플리케이션 사용자 생성
db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: [
    {
      role: 'readWrite',
      db: 'cms_db'
    }
  ]
});

// 컬렉션 생성 및 스키마 검증 설정
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'password'],
      properties: {
        email: {
          bsonType: 'string',
          description: '이메일은 필수이며 문자열이어야 합니다'
        },
        name: {
          bsonType: 'string',
          maxLength: 100,
          description: '이름은 필수이며 100자 이하여야 합니다'
        },
        password: {
          bsonType: 'string',
          description: '비밀번호는 필수입니다'
        },
        created_at: {
          bsonType: 'date',
          description: '생성일시'
        }
      }
    }
  }
});

db.createCollection('folders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'owner_id'],
      properties: {
        name: {
          bsonType: 'string',
          description: '폴더명은 필수입니다'
        },
        parent_folder_id: {
          bsonType: ['objectId', 'null'],
          description: '부모 폴더 ID'
        },
        owner_id: {
          bsonType: 'objectId',
          description: '소유자 ID는 필수입니다'
        },
        created_at: {
          bsonType: 'date',
          description: '생성일시'
        }
      }
    }
  }
});

db.createCollection('files', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'path_on_disk', 'file_size', 'owner_id'],
      properties: {
        name: {
          bsonType: 'string',
          description: '파일명은 필수입니다'
        },
        path_on_disk: {
          bsonType: 'string',
          description: '디스크상 경로는 필수입니다'
        },
        file_size: {
          bsonType: 'long',
          minimum: 0,
          description: '파일 크기는 필수이며 0 이상이어야 합니다'
        },
        parent_folder_id: {
          bsonType: ['objectId', 'null'],
          description: '부모 폴더 ID'
        },
        owner_id: {
          bsonType: 'objectId',
          description: '소유자 ID는 필수입니다'
        },
        created_at: {
          bsonType: 'date',
          description: '생성일시'
        },
        is_deleted: {
          bsonType: 'bool',
          description: '삭제 여부'
        },
        deleted_at: {
          bsonType: ['date', 'null'],
          description: '삭제일시'
        }
      }
    }
  }
});

// 인덱스 생성
// print('인덱스 생성 중...');

// // 사용자 컬렉션 인덱스
// db.users.createIndex({ email: 1 }, { unique: true });
// db.users.createIndex({ created_at: 1 });

// // 폴더 컬렉션 인덱스
// db.folders.createIndex({ parent_folder_id: 1 });
// db.folders.createIndex({ owner_id: 1 });
// db.folders.createIndex({ owner_id: 1, parent_folder_id: 1 });
// db.folders.createIndex({ created_at: 1 });
// db.folders.createIndex({ owner_id: 1, parent_folder_id: 1, name: 1 });

// // 파일 컬렉션 인덱스
// db.files.createIndex({ parent_folder_id: 1 });
// db.files.createIndex({ owner_id: 1 });
// db.files.createIndex({ owner_id: 1, parent_folder_id: 1 });
// db.files.createIndex({ name: 1 });
// db.files.createIndex({ created_at: 1 });
// db.files.createIndex({ file_size: 1 });
// db.files.createIndex({ path_on_disk: 1 }, { unique: true });
// db.files.createIndex({ owner_id: 1, parent_folder_id: 1, name: 1 });

// print('인덱스 생성 완료');

// 샘플 데이터 (주석 해제시 사용)

print('샘플 데이터 삽입 중...');

// 사용자 생성
const adminUser = db.users.insertOne({
  email: 'admin@example.com',
  name: 'Admin',
  password: 'hashed_password_here',
  created_at: new Date(),
});

const adminUserId = adminUser.insertedId;

// 루트 폴더 생성 (MyDrive)
const rootFolder = db.folders.insertOne({
  name: 'MyDrive',
  parent_folder_id: null,
  owner_id: adminUserId,
  created_at: new Date()
});

const rootFolderId = rootFolder.insertedId;

// 하위 폴더 생성
const schoolFolder = db.folders.insertOne({
  name: '학교과제',
  parent_folder_id: rootFolderId,
  owner_id: adminUserId,
  created_at: new Date()
});

const reportFolder = db.folders.insertOne({
  name: '3월보고서',
  parent_folder_id: schoolFolder.insertedId,
  owner_id: adminUserId,
  created_at: new Date()
});

// 예시 파일 생성
db.files.insertOne({
  name: 'abc.pdf',
  path_on_disk: '/data/files/uuid123abc.pdf',
  file_size: NumberLong(1024000),
  parent_folder_id: reportFolder.insertedId,
  owner_id: adminUserId,
  created_at: new Date(),
  is_deleted: false,
  deleted_at: null
});

print('샘플 데이터 삽입 완료');


print('MongoDB 초기화 스크립트 실행 완료');