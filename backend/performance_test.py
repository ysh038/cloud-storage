import asyncio
import sys
import time
from pathlib import Path

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from app.model.user import User
from app.model.folder import Folder
from app.model.file import File
from sqlalchemy import select, func, text
import random

async def run_performance_tests():
    print("=== 성능 테스트 시작 ===\n")
    
    async with AsyncSessionLocal() as db:
        try:
            # 테스트용 사용자 ID들 가져오기
            result = await db.execute(select(User.id).limit(10))
            user_ids = [row[0] for row in result.fetchall()]
            
            if not user_ids:
                print("테스트할 사용자가 없습니다. 먼저 더미 데이터를 생성하세요.")
                return
            
            # 테스트용 폴더 ID들 가져오기
            result = await db.execute(select(Folder.id).limit(10))
            folder_ids = [row[0] for row in result.fetchall()]
            
            test_user_id = random.choice(user_ids)
            
            # 1. 폴더 조회 성능 테스트
            print("1. 폴더 조회 성능 테스트")
            
            start_time = time.time()
            result = await db.execute(
                select(Folder).where(
                    Folder.owner_id == test_user_id,
                    Folder.parent_folder_id.is_(None)
                )
            )
            folders = result.scalars().all()
            end_time = time.time()
            print(f"   루트 폴더 조회 (사용자 {test_user_id}): {end_time - start_time:.4f}초 ({len(folders)}개)")
            
            # 서브 폴더 조회
            if folder_ids:
                test_folder_id = random.choice(folder_ids)
                start_time = time.time()
                result = await db.execute(
                    select(Folder).where(
                        Folder.owner_id == test_user_id,
                        Folder.parent_folder_id == test_folder_id
                    )
                )
                subfolders = result.scalars().all()
                end_time = time.time()
                print(f"   서브 폴더 조회: {end_time - start_time:.4f}초 ({len(subfolders)}개)")
            
            # 2. 파일 조회 성능 테스트
            print("\n2. 파일 조회 성능 테스트")
            
            start_time = time.time()
            result = await db.execute(
                select(File).where(
                    File.owner_id == test_user_id,
                    File.parent_folder_id.is_(None)
                )
            )
            files = result.scalars().all()
            end_time = time.time()
            print(f"   루트 파일 조회: {end_time - start_time:.4f}초 ({len(files)}개)")
            
            # 특정 폴더의 파일 조회
            if folder_ids:
                test_folder_id = random.choice(folder_ids)
                start_time = time.time()
                result = await db.execute(
                    select(File).where(File.parent_folder_id == test_folder_id)
                )
                folder_files = result.scalars().all()
                end_time = time.time()
                print(f"   특정 폴더 파일 조회: {end_time - start_time:.4f}초 ({len(folder_files)}개)")
            
            # 3. 페이지네이션 테스트
            print("\n3. 페이지네이션 테스트")
            
            start_time = time.time()
            result = await db.execute(
                select(File).where(File.owner_id == test_user_id)
                .order_by(File.created_at.desc())
                .limit(50)
                .offset(0)
            )
            page1_files = result.scalars().all()
            end_time = time.time()
            print(f"   첫 페이지 (LIMIT 50): {end_time - start_time:.4f}초 ({len(page1_files)}개)")
            
            start_time = time.time()
            result = await db.execute(
                select(File).where(File.owner_id == test_user_id)
                .order_by(File.created_at.desc())
                .limit(50)
                .offset(1000)
            )
            page_mid_files = result.scalars().all()
            end_time = time.time()
            print(f"   중간 페이지 (OFFSET 1000): {end_time - start_time:.4f}초 ({len(page_mid_files)}개)")
            
            # 4. 검색 테스트
            print("\n4. 검색 테스트")
            
            start_time = time.time()
            result = await db.execute(
                select(File).where(
                    File.owner_id == test_user_id,
                    File.name.ilike('%file_1%')
                )
            )
            search_files = result.scalars().all()
            end_time = time.time()
            print(f"   파일명 검색 (ILIKE): {end_time - start_time:.4f}초 ({len(search_files)}개)")
            
            # 5. 집계 쿼리 테스트
            print("\n5. 집계 쿼리 테스트")
            
            start_time = time.time()
            result = await db.execute(
                select(func.count(File.id)).where(File.owner_id == test_user_id)
            )
            file_count = result.scalar()
            end_time = time.time()
            print(f"   파일 개수 집계: {end_time - start_time:.4f}초 ({file_count}개)")
            
            start_time = time.time()
            result = await db.execute(
                select(func.sum(File.file_size)).where(File.owner_id == test_user_id)
            )
            total_size = result.scalar() or 0
            end_time = time.time()
            print(f"   파일 크기 합계: {end_time - start_time:.4f}초 ({total_size:,} bytes)")
            
            # 6. 전체 통계
            print("\n=== 전체 데이터 통계 ===")
            
            user_count = await db.execute(select(func.count(User.id)))
            folder_count = await db.execute(select(func.count(Folder.id)))
            file_count = await db.execute(select(func.count(File.id)))
            
            print(f"총 사용자: {user_count.scalar():,}명")
            print(f"총 폴더: {folder_count.scalar():,}개")
            print(f"총 파일: {file_count.scalar():,}개")
            
            # 7. 성능 개선 제안
            print("\n=== 성능 개선 제안 ===")
            print("다음 인덱스 생성을 권장합니다:")
            print("CREATE INDEX idx_folders_owner_parent ON folders(owner_id, parent_folder_id);")
            print("CREATE INDEX idx_files_owner_parent ON files(owner_id, parent_folder_id);")
            print("CREATE INDEX idx_files_name ON files(name);")
            print("CREATE INDEX idx_files_created_at ON files(created_at);")
            
        except Exception as e:
            print(f"오류 발생: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_performance_tests())