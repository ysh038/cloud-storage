from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os

# MongoDB 클라이언트 및 데이터베이스 인스턴스
client = None
database = None

def connect_to_mongodb():
    """MongoDB 연결 함수"""
    global client, database
    
    try:
        # 환경 변수에서 연결 정보 가져오기 (기본값 설정)
        mongo_url = os.getenv("MONGODB_URL", "mongodb://admin:password@localhost:27017")
        db_name = os.getenv("MONGODB_DB", "cms_db")
        
        # MongoDB 클라이언트 생성
        client = MongoClient(mongo_url)
        
        # 연결 테스트
        client.admin.command('ping')
        print("MongoDB 연결 성공!")
        
        # 데이터베이스 선택
        database = client[db_name]
        return client, database
        
    except ConnectionFailure:
        print("MongoDB 연결 실패!")
        return None, None
    except ServerSelectionTimeoutError:
        print("MongoDB 서버 선택 타임아웃!")
        return None, None

def get_database():
    """데이터베이스 인스턴스 반환 (Dependency Injection용)"""
    global database
    if database is None:
        connect_to_mongodb()
    return database

def close_database():
    """데이터베이스 연결 종료"""
    global client
    if client:
        client.close()
        print("MongoDB 연결 종료")