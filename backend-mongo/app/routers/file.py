from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Header
from app.database import get_database
from pymongo.database import Database
from bson import ObjectId, Int64
from app.schemas.file import FileCreate, FileUpdate
from pathlib import Path
import mimetypes
import uuid
from bson.errors import InvalidId
from datetime import datetime
from typing import Optional
from app.utilities.auth import get_user_id
from fastapi.responses import FileResponse
from urllib.parse import quote
import asyncio
import json

router = APIRouter()

@router.get("/files")
async def get_files(authorization: Optional[str] = Header(None), parent_folder_id: Optional[str] = None, db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        if parent_folder_id == "0" or parent_folder_id == "":
            files = list(db.files.find({"parent_folder_id": None, "owner_id": user_id, "is_deleted": {"$ne": True}}))
        else:
            files = list(db.files.find({"parent_folder_id": ObjectId(parent_folder_id), "owner_id": user_id, "is_deleted": {"$ne": True}}))
        # ObjectId를 문자열로 변환
        for file in files:
            file["_id"] = str(file["_id"])
            if file.get("parent_folder_id"):
                file["parent_folder_id"] = str(file["parent_folder_id"])
            file["owner_id"] = str(file["owner_id"])
        return {"files": files}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# @router.get("/files/{parent_folder_id}")
# async def get_file(parent_folder_id: str, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
#     try:
#         if not authorization:
#             raise HTTPException(status_code=401, detail="Unauthorized")
        
#         user_id = get_user_id(authorization, db)
#         files = list(db.files.find({"parent_folder_id": ObjectId(parent_folder_id), "owner_id": user_id}))

#         if not files:
#             raise HTTPException(status_code=404, detail="File not found")
        
#         for file in files:
#             file["_id"] = str(file["_id"])
#             if file.get("parent_folder_id"):
#                 file["parent_folder_id"] = str(file["parent_folder_id"])
#             file["owner_id"] = str(file["owner_id"])
#         return {"files": files}
    
#     except HTTPException:
#         raise
#     except InvalidId:
#         raise HTTPException(status_code=400, detail="Invalid parent_folder_id")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.delete("/files/{file_id}")
async def delete_file(file_id: str, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        file = db.files.find_one({"_id": ObjectId(file_id), "owner_id": user_id})

        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        file["is_deleted"] = True
        file["deleted_at"] = datetime.now()
        db.files.update_one({"_id": ObjectId(file_id)}, {"$set": file})
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.post("/file/restore/{file_id}")
async def restore_file(file_id: str, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        file = db.files.find_one({"_id": ObjectId(file_id), "owner_id": user_id})
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        file["is_deleted"] = False
        file["deleted_at"] = None
        db.files.update_one({"_id": ObjectId(file_id)}, {"$set": file})
        return {"message": "File restored successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# 파일 저장 기본 경로 (절대 경로로 설정)
BASE_UPLOAD_PATH = Path(__file__).parent.parent.parent / "data"  # backend-mongo/data

def safe_parent_folder_id(parent_id: Optional[str]) -> Optional[ObjectId]:
    """안전한 parent_folder_id 변환"""
    if not parent_id or parent_id == "0" or parent_id == "":
        return None
    try:
        return ObjectId(parent_id)
    except:
        return None
    
def create_user_directory(user_id: str) -> Path:
    """사용자별 디렉토리 생성"""
    user_dir = BASE_UPLOAD_PATH / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir

def generate_unique_filename(original_filename: str) -> str:
    """고유한 파일명 생성 (중복 방지)"""
    # 파일 확장자 추출
    file_extension = Path(original_filename).suffix
    # UUID + 원본 파일명 조합
    unique_name = f"{uuid.uuid4()}_{original_filename}"
    return unique_name

def get_file_mimetype(filename: str) -> str:
    """파일의 MIME 타입 추출"""
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"

def get_relative_path_safe(file_path: Path) -> str:
    """안전한 상대 경로 계산"""
    try:
        # 현재 작업 디렉토리 기준으로 상대 경로 계산
        current_dir = Path.cwd()
        return str(file_path.relative_to(current_dir))
    except ValueError:
        # relative_to 실패 시 절대 경로 반환
        return str(file_path.absolute())

def generate_unique_filename(original_filename: str) -> str:
    """고유한 파일명 생성 (경로 제거)"""
    # 파일명에서 경로 부분 제거
    filename_only = Path(original_filename).name  # "test/test.txt" → "test.txt"
    
    # 파일 확장자 추출
    file_extension = Path(filename_only).suffix
    filename_without_ext = Path(filename_only).stem
    
    # UUID + 원본 파일명 조합
    unique_name = f"{uuid.uuid4()}_{filename_without_ext}{file_extension}"
    return unique_name

@router.post("/files")
async def upload_file(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    metadata: str = Form(...),
    db: Database = Depends(get_database)
):
    """
    파일 업로드 및 저장
    """
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)

        clean_filename = Path(file.filename).name if file.filename else "unknown"

        # 1. 입력 검증
        if not file.filename:
            raise HTTPException(status_code=400, detail="파일명이 없습니다")
        
        # ObjectId 검증
        owner_object_id = ObjectId(user_id)

        metadata_dict = json.loads(metadata)
        parent_folder_id_str = metadata_dict["parent_folder_id"]
        
        parent_folder_object_id = safe_parent_folder_id(parent_folder_id_str)
        if parent_folder_object_id:
            
            # 부모 폴더 존재 확인
            parent_folder = db.folders.find_one({"_id": parent_folder_object_id})
            if not parent_folder:
                raise HTTPException(status_code=404, detail="부모 폴더를 찾을 수 없습니다")
        
        # 사용자 존재 확인
        user = db.users.find_one({"_id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        
        # 2. 파일 크기 확인 (예: 10000MB 제한)
        MAX_FILE_SIZE = 10000 * 1024 * 1024  # 10GB
        print(f"{user_id}가 업로드한 파일 읽기 시작")

        file_content = await file.read()
        print(f"{user_id}가 업로드한 파일 읽기 완료")
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"파일 크기가 너무 큽니다. 최대 {MAX_FILE_SIZE // (1024*1024)}MB까지 허용됩니다"
            )
        
        if file_size == 0:
            raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없습니다")
        
        # 3. 사용자별 디렉토리 생성
        user_dir = create_user_directory(str(user_id))
        
        # 4. 고유한 파일명 생성
        unique_filename = generate_unique_filename(clean_filename)
        file_path = user_dir / unique_filename
        
        # 5. 실제 파일 저장
        try:
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"파일 저장 실패: {str(e)}"
            )
        
        # 6. 파일 메타데이터 생성 (수정된 부분)
        file_metadata = {
            "name": clean_filename,  # 필수 필드
            "path_on_disk": str(file_path.absolute()),  # 필수 필드
            "file_size": Int64(file_size),  # 필수 필드
            "owner_id": owner_object_id,  # 필수 필드
            "parent_folder_id": parent_folder_object_id,  # null 허용
            "created_at": datetime.now()  # 선택 필드
        }
        
        print(f"저장할 메타데이터: {file_metadata}")  # 디버깅용
        
        # 7. 데이터베이스에 메타데이터 저장
        result = db.files.insert_one(file_metadata)
        
        # 8. 응답 데이터 준비
        response_data = file_metadata.copy()
        response_data["_id"] = str(result.inserted_id)
        response_data["owner_id"] = str(response_data["owner_id"])
        if response_data["parent_folder_id"]:
            response_data["parent_folder_id"] = str(response_data["parent_folder_id"])
        
        # 응답용 추가 메타데이터 (DB에는 저장하지 않음)
        response_data.update({
            "stored_filename": unique_filename,
            "relative_path": get_relative_path_safe(file_path),
            "mime_type": get_file_mimetype(file.filename),
            "upload_status": "completed"
        })

        return {
            "message": "파일이 성공적으로 업로드되었습니다",
            "file": response_data,
            "upload_info": {
                "original_filename": file.filename,
                "stored_filename": unique_filename,
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "storage_path": str(user_dir),
                "absolute_path": str(file_path.absolute()),
                "base_upload_path": str(BASE_UPLOAD_PATH.absolute())
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # 업로드 실패 시 저장된 파일 삭제
        if 'file_path' in locals() and file_path.exists():
            try:
                file_path.unlink()
                print(f"실패한 업로드 파일 삭제: {file_path}")
            except:
                pass
        
        raise HTTPException(status_code=500, detail=f"파일 업로드 실패: {str(e)}")
    
@router.get("/files/download/{file_id}")
async def download_file(
    file_id: str,
    authorization: Optional[str] = Header(None),
    db: Database = Depends(get_database)
):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
    
        file = db.files.find_one({"_id": ObjectId(file_id), "owner_id": user_id})
        if not file:
            raise HTTPException(status_code=404, detail="File not found")

        file_path = Path(file["path_on_disk"])
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        mime_type, _ = mimetypes.guess_type(file["name"])
        if mime_type is None:
            mime_type = "application/octet-stream"

        filename = file["name"]
        encoded_filename = quote(filename.encode('utf-8'))
        
        return FileResponse(
            path=file_path,
            filename=encoded_filename,
            media_type=mime_type,
            headers={"Content-Disposition": f"attachment; filename={encoded_filename}",
            "X-Filename": encoded_filename}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/files/{file_id}")
async def update_file(file_id: str, update_data: FileUpdate, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        # 파일 조회
        file = db.files.find_one({"_id": ObjectId(file_id), "owner_id": user_id})
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        # 업데이트할 필드만 선택적으로 구성 (folder와 동일한 방식)
        update_fields = {}
        
        if update_data.name is not None:
            update_fields["name"] = update_data.name
        
        # folder와 동일한 로직
        if hasattr(update_data, 'parent_folder_id') and update_data.parent_folder_id is not None:
            if update_data.parent_folder_id == "0" or update_data.parent_folder_id == "":
                update_fields["parent_folder_id"] = None  # 루트로 이동
            else:
                update_fields["parent_folder_id"] = ObjectId(update_data.parent_folder_id)
        
        # 업데이트 실행
        if update_fields:
            result = db.files.update_one(
                {"_id": ObjectId(file_id), "owner_id": user_id}, 
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                return {"message": "File updated successfully", "file_id": file_id}
            else:
                raise HTTPException(status_code=404, detail="File not found or no changes made")
        else:
            raise HTTPException(status_code=400, detail="No update data provided")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.get("/files/trash")
async def get_trash_files(authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        files = list(db.files.find({"owner_id": user_id, "is_deleted": True}))

        for file in files:
            file["_id"] = str(file["_id"])
            file["owner_id"] = str(file["owner_id"])
            if file.get("parent_folder_id"):
                file["parent_folder_id"] = str(file["parent_folder_id"])

        return {"files": files}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.post("/files/{file_id}/restore")
async def restore_file(file_id: str, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # file_id 유효성 검사 추가
        if not file_id or file_id == "undefined":
            raise HTTPException(status_code=400, detail="Invalid file ID")
        
        user_id = get_user_id(authorization, db)
        
        # 파일 존재 확인
        file = db.files.find_one({"_id": ObjectId(file_id), "owner_id": user_id})
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        # 필요한 필드만 업데이트 (_id 제외)
        update_fields = {
            "is_deleted": False,
            "deleted_at": None
        }
        
        result = db.files.update_one(
            {"_id": ObjectId(file_id), "owner_id": user_id}, 
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            return {"message": "File restored successfully", "file_id": file_id}
        else:
            raise HTTPException(status_code=500, detail="File restoration failed")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    
@router.delete("/files/{file_id}/permanent")
async def delete_file_permanent(file_id: str, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        file = db.files.find_one({"_id": ObjectId(file_id), "owner_id": user_id})
        if not file:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = Path(file["path_on_disk"])
        if file_path.exists():
            file_path.unlink()
            print(f"파일 삭제: {file_path}")
        else:
            print(f"파일 삭제 실패: {file_path}")
            raise HTTPException(status_code=404, detail="File not found")
        
        db.files.delete_one({"_id": ObjectId(file_id)})
        return {"message": "File deleted permanently"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    