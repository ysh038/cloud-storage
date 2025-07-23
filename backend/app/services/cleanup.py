from datetime import datetime, timedelta
from sqlalchemy import select
from app.model.file import File
from app.database import get_async_db
from pathlib import Path

async def cleanup_old_trash_files():
    """일주일 이상 된 휴지통 파일들을 정리"""
    async with get_async_db() as db:
        # 일주일 이전 시점 계산
        week_ago = datetime.now() - timedelta(days=7)
        
        # 일주일 이상 된 휴지통 파일들 조회
        old_files_query = select(File).where(
            File.is_deleted == True,
            File.deleted_at < week_ago
        )
        
        result = await db.execute(old_files_query)
        old_files = result.scalars().all()
        
        for file in old_files:
            # 실제 파일 삭제
            file_path = Path(file.path_on_disk)
            if file_path.exists():
                try:
                    file_path.unlink()
                    print(f"Deleted file: {file.name}")
                except Exception as e:
                    print(f"Failed to delete file {file.name}: {e}")
            
            # DB에서 파일 정보 삭제
            await db.delete(file)
        
        await db.commit()
        print(f"Cleaned up {len(old_files)} old files")