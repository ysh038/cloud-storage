import asyncio
import sys
import os
from pathlib import Path

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(str(Path(__file__).parent))

from app.database import get_async_db, AsyncSessionLocal
from app.model.user import User
from app.model.folder import Folder
from app.model.file import File
from datetime import datetime, timedelta
import random
import uuid
from sqlalchemy import select, func
import bcrypt

async def generate_dummy_data():
    print("더미 데이터 생성 시작...")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 사용자 데이터 생성 (100명)
            print("사용자 데이터 생성 중...")
            users = []
            hashed_password = bcrypt.hashpw("test".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

            for i in range(100):
                user = User(
                    email=f"user{i}@example.com",
                    name=f"User {i}",
                    password=hashed_password,
                    created_at=datetime.now() - timedelta(days=random.randint(1, 365))
                )
                users.append(user)
                db.add(user)
            
            await db.commit()
            print(f"사용자 {len(users)}명 생성 완료")
            
            # 사용자 ID 조회
            result = await db.execute(select(User.id))
            user_ids = [row[0] for row in result.fetchall()]
            
            # 2. 폴더 데이터 생성 (1,000,000개) - Depth 10까지
            print("폴더 데이터 생성 중 (Depth 10까지)...")
            
            # 각 depth별 폴더 생성 전략
            depth_folders = {}  # depth -> [(folder_id, owner_id)] 매핑
            total_created = 0
            target_total = 1000000
            batch_size = 5000
            
            # Depth 1: 루트 폴더 (사용자당 50개)
            print("Depth 1 (루트 폴더) 생성 중...")
            depth1_folders = []
            for user_id in user_ids:
                for i in range(50):
                    folder = Folder(
                        name=f"Root_{i}_User{user_id}",
                        parent_folder_id=None,
                        owner_id=user_id,
                        created_at=datetime.now() - timedelta(days=random.randint(1, 365))
                    )
                    depth1_folders.append(folder)
                    db.add(folder)
            
            await db.commit()
            total_created += len(depth1_folders)
            print(f"Depth 1 완료: {len(depth1_folders)}개 (총 {total_created:,}개)")
            
            # Depth 1 폴더 ID 조회
            result = await db.execute(select(Folder.id, Folder.owner_id).where(Folder.parent_folder_id.is_(None)))
            depth_folders[1] = [(row[0], row[1]) for row in result.fetchall()]
            
            # Depth 2-10: 각 depth별로 폴더 생성
            for current_depth in range(2, 11):
                if total_created >= target_total:
                    break
                    
                print(f"Depth {current_depth} 폴더 생성 중...")
                parent_folders = depth_folders[current_depth - 1]
                
                # 이 depth에서 생성할 폴더 수 계산
                remaining_folders = target_total - total_created
                folders_per_parent = max(1, min(20, remaining_folders // len(parent_folders)))
                
                # 남은 폴더 수가 적으면 일부 부모만 사용
                if remaining_folders < len(parent_folders):
                    parent_folders = random.sample(parent_folders, remaining_folders)
                    folders_per_parent = 1
                
                print(f"  부모 폴더 {len(parent_folders)}개, 각각 {folders_per_parent}개씩 생성")
                
                current_depth_folders = []
                batch_count = 0
                
                for parent_id, owner_id in parent_folders:
                    for i in range(folders_per_parent):
                        if total_created >= target_total:
                            break
                            
                        folder = Folder(
                            name=f"D{current_depth}_F{i}_P{parent_id}",
                            parent_folder_id=parent_id,
                            owner_id=owner_id,
                            created_at=datetime.now() - timedelta(days=random.randint(1, 365))
                        )
                        current_depth_folders.append(folder)
                        db.add(folder)
                        total_created += 1
                        
                        # 배치 처리
                        if len(current_depth_folders) >= batch_size:
                            await db.commit()
                            batch_count += 1
                            print(f"    Depth {current_depth} 배치 {batch_count} 완료 ({len(current_depth_folders)}개)")
                            current_depth_folders = []
                    
                    if total_created >= target_total:
                        break
                
                # 남은 폴더들 커밋
                if current_depth_folders:
                    await db.commit()
                    batch_count += 1
                    print(f"    Depth {current_depth} 마지막 배치 완료 ({len(current_depth_folders)}개)")
                
                print(f"Depth {current_depth} 완료 (총 {total_created:,}개)")
                
                # 현재 depth의 폴더 ID들 조회 (다음 depth의 부모가 됨)
                if current_depth < 10 and total_created < target_total:
                    # 효율성을 위해 최근 생성된 폴더들만 조회
                    result = await db.execute(
                        select(Folder.id, Folder.owner_id)
                        .where(Folder.name.like(f'D{current_depth}_%'))
                        .limit(50000)  # 너무 많으면 메모리 문제 발생 가능
                    )
                    depth_folders[current_depth] = [(row[0], row[1]) for row in result.fetchall()]
                    print(f"  다음 depth용 부모 폴더 {len(depth_folders[current_depth])}개 준비")
            
            # 남은 폴더들을 랜덤 depth에 배치
            if total_created < target_total:
                print("남은 폴더들을 랜덤 배치 중...")
                remaining = target_total - total_created
                
                # 모든 기존 폴더들을 부모 후보로 사용
                result = await db.execute(select(Folder.id, Folder.owner_id).limit(100000))
                all_parent_candidates = [(row[0], row[1]) for row in result.fetchall()]
                
                for i in range(remaining):
                    parent_id, owner_id = random.choice(all_parent_candidates)
                    
                    folder = Folder(
                        name=f"Random_{i}_P{parent_id}",
                        parent_folder_id=parent_id,
                        owner_id=owner_id,
                        created_at=datetime.now() - timedelta(days=random.randint(1, 365))
                    )
                    db.add(folder)
                    
                    if (i + 1) % batch_size == 0:
                        await db.commit()
                        print(f"  랜덤 배치 {(i + 1) // batch_size} 완료")
                
                await db.commit()
                total_created = target_total
                print(f"랜덤 배치 완료 (총 {total_created:,}개)")
            
            # 3. 파일 데이터 생성 (10,000개)
            print("파일 데이터 생성 중...")
            
            # 모든 폴더 ID 조회 (파일 배치용)
            result = await db.execute(select(Folder.id, Folder.owner_id).limit(50000))
            all_folders = [(row[0], row[1]) for row in result.fetchall()]
            
            file_extensions = ['.txt', '.pdf', '.jpg', '.png', '.doc', '.xlsx', '.zip', '.mp4', '.mp3', '.pptx']
            
            # 파일 배치 처리
            file_batch_size = 1000
            total_files = 10000
            
            for batch_start in range(0, total_files, file_batch_size):
                batch_end = min(batch_start + file_batch_size, total_files)
                
                for i in range(batch_start, batch_end):
                    folder_id, owner_id = random.choice(all_folders)
                    extension = random.choice(file_extensions)
                    file_size = random.randint(1024, 104857600)  # 1KB ~ 100MB
                    
                    file = File(
                        name=f"file_{i}{extension}",
                        path_on_disk=f"data/files/{owner_id}/{datetime.now().year}/{datetime.now().month:02d}/{uuid.uuid4()}{extension}",
                        file_size=file_size,
                        parent_folder_id=folder_id,
                        owner_id=owner_id,
                        created_at=datetime.now() - timedelta(days=random.randint(1, 365))
                    )
                    db.add(file)
                
                await db.commit()
                print(f"파일 배치 {batch_start//file_batch_size + 1} 완료 ({batch_end - batch_start}개)")
            
            # 최종 통계 출력
            user_count = await db.execute(select(func.count(User.id)))
            folder_count = await db.execute(select(func.count(Folder.id)))
            file_count = await db.execute(select(func.count(File.id)))
            
            print(f"\n=== 최종 생성된 데이터 통계 ===")
            print(f"사용자: {user_count.scalar():,}명")
            print(f"폴더: {folder_count.scalar():,}개")
            print(f"파일: {file_count.scalar():,}개")
            
            # 폴더 깊이별 분석
            print(f"\n=== 폴더 깊이별 분석 ===")
            
            # 루트 폴더 수
            root_count = await db.execute(
                select(func.count(Folder.id)).where(Folder.parent_folder_id.is_(None))
            )
            print(f"Depth 1 (루트): {root_count.scalar():,}개")
            
            # 각 depth별 폴더 수 (샘플링)
            for depth in range(2, 11):
                depth_sample = await db.execute(
                    select(func.count(Folder.id)).where(Folder.name.like(f'D{depth}_%'))
                )
                count = depth_sample.scalar()
                if count > 0:
                    print(f"Depth {depth}: {count:,}개")
            
            # 랜덤 배치된 폴더 수
            random_count = await db.execute(
                select(func.count(Folder.id)).where(Folder.name.like('Random_%'))
            )
            if random_count.scalar() > 0:
                print(f"랜덤 배치: {random_count.scalar():,}개")
            
            print("더미 데이터 생성 완료!")
            
        except Exception as e:
            print(f"오류 발생: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise

if __name__ == "__main__":
    asyncio.run(generate_dummy_data())