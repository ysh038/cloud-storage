from fastapi import APIRouter, HTTPException, Depends, Header
from app.database import get_database
from pymongo.database import Database
from bson import ObjectId
from typing import List, Optional
from app.schemas.folder import FolderCreate, FolderPatch
from app.utilities.auth import get_user_id
import os

router = APIRouter()

@router.get("/folders/")
async def get_folders(authorization: Optional[str] = Header(None), current_folder_id: Optional[str] = None, db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        if current_folder_id and current_folder_id != "0":
            # 특정 폴더의 하위 폴더들 조회
            folders = list(db.folders.find({"parent_folder_id": ObjectId(current_folder_id), "owner_id": user_id}))
        else:
            # 최상위 폴더들 조회 (current_folder_id가 None이거나 "0"인 경우)
            folders = list(db.folders.find({"parent_folder_id": None, "owner_id": user_id}))
        
        for folder in folders:
            folder["_id"] = str(folder["_id"])
            folder["owner_id"] = str(folder["owner_id"])
            if folder.get("parent_folder_id"):
                folder["parent_folder_id"] = str(folder["parent_folder_id"])

        if current_folder_id and current_folder_id != "0":
            # 특정 폴더의 하위 폴더들 조회
            folders = list(db.folders.find({"parent_folder_id": ObjectId(current_folder_id), "owner_id": user_id}))
            
            # 현재 폴더 정보 조회하여 부모 폴더 ID 가져오기
            current_folder = db.folders.find_one({"owner_id": user_id, "_id": ObjectId(current_folder_id)})
            if current_folder and current_folder.get("parent_folder_id"):
                parent_folder_id = str(current_folder["parent_folder_id"])
            else:
                parent_folder_id = None
        else:
            # 최상위 폴더들 조회
            folders = list(db.folders.find({"parent_folder_id": None, "owner_id": user_id}))
            parent_folder_id = None

        for folder in folders:
            folder["_id"] = str(folder["_id"])
            folder["owner_id"] = str(folder["owner_id"])
            if folder.get("parent_folder_id"):
                folder["parent_folder_id"] = str(folder["parent_folder_id"])

        return {"folders": folders, "parent_folder_id": parent_folder_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def delete_folder_recursively_safe(folder_id: ObjectId, user_id: ObjectId, db: Database) -> dict:
    deleted_folders = []
    deleted_files = []
    
    def collect_all_descendants(parent_id: ObjectId) -> List[ObjectId]:
        """모든 하위 폴더 ID들을 재귀적으로 수집"""
        all_ids = []
        
        # 직접 하위 폴더들 찾기
        direct_children = list(db.folders.find({"parent_folder_id": parent_id}))
        
        for child in direct_children:
            child_id = child["_id"]
            all_ids.append(child_id)
            
            # 재귀적으로 하위의 하위 폴더들도 수집
            deeper_children = collect_all_descendants(child_id)
            all_ids.extend(deeper_children)
        
        return all_ids
    
    try:
        # 1. 삭제할 폴더가 실제로 존재하는지 확인
        target_folder = db.folders.find_one({"_id": folder_id, "owner_id": user_id})
        if not target_folder:
            raise HTTPException(status_code=404, detail="Folder not found")
        
        print(f"폴더 삭제 시작: {target_folder.get('name')}")
        
        # 2. 모든 하위 폴더 ID들 수집
        all_subfolder_ids = collect_all_descendants(folder_id)
        all_folder_ids = [folder_id] + all_subfolder_ids
        
        print(f"삭제할 폴더들: {len(all_folder_ids)}개")
        
        # 3. 모든 관련 파일들 삭제 (폴더별로)
        total_files_deleted = 0
        for fid in all_folder_ids:
            # 해당 폴더의 파일들 찾기
            files_in_folder = list(db.files.find({"parent_folder_id": fid, "owner_id": user_id}))
            
            if files_in_folder:
                file_ids = [f["_id"] for f in files_in_folder]
                
                # 파일들 삭제
                for file_id in file_ids:
                    file_info = db.files.find_one({"_id": file_id, "owner_id": user_id})
                    if file_info:
                        file_path = file_info.get("path_on_disk")
                        if file_path:
                            try:
                                os.remove(file_path)
                            except Exception as e:
                                print(f"파일 삭제 중 오류: {str(e)}")

                delete_result = db.files.delete_many({"_id": {"$in": file_ids}})
                
                total_files_deleted += delete_result.deleted_count
                deleted_files.extend([str(fid) for fid in file_ids])
                
                print(f"폴더 {str(fid)}에서 {delete_result.deleted_count}개 파일 삭제")
        
        # 4. 폴더들 삭제 (하위부터 역순으로 - 매우 중요!)
        all_folder_ids.reverse()
        
        for fid in all_folder_ids:
            folder_info = db.folders.find_one({"_id": fid, "owner_id": user_id})
            if folder_info:
                # 폴더 삭제
                delete_result = db.folders.delete_one({"_id": fid})
                
                if delete_result.deleted_count > 0:
                    deleted_folders.append(str(fid))
                    print(f"폴더 삭제: {folder_info.get('name')} (ID: {str(fid)})")
        
        print("폴더 삭제 완료")
        
        return {
            "success": True,
            "deleted_folders": deleted_folders,
            "deleted_files": deleted_files,
            "total_folders_deleted": len(deleted_folders),
            "total_files_deleted": total_files_deleted,
            "method": "순차 삭제 (트랜잭션 미사용)"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"폴더 삭제 중 오류: {str(e)}")
        
        return {
            "success": False,
            "error": str(e),
            "message": "폴더 삭제 중 오류가 발생했습니다. 일부 데이터가 불완전하게 삭제되었을 수 있습니다."
        }

@router.delete("/folders/{folder_id}")
async def delete_folder_safe(folder_id: str, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        # 사용자 ID 추출
        user_id = get_user_id(authorization, db)
        
        # 재귀 삭제 실행 (수정됨)
        result = await delete_folder_recursively_safe(ObjectId(folder_id), user_id, db)
        
        if result["success"]:
            return {
                "message": "폴더 및 모든 하위 항목이 삭제되었습니다",
                "deleted_folder_id": folder_id,
                "deletion_summary": result,
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"삭제 실패: {result.get('error', 'Unknown error')}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"폴더 삭제 중 오류: {str(e)}"
        )
    
@router.patch("/folders/{folder_id}/")
async def patch_folder(folder_id: str, folder: FolderPatch, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)

        # 업데이트할 필드만 선택적으로 구성
        update_fields = {}
        
        if folder.name is not None:
            update_fields["name"] = folder.name
            
        if hasattr(folder, 'parent_folder_id') and folder.parent_folder_id is not None:
            if folder.parent_folder_id == "0" or folder.parent_folder_id == "":
                update_fields["parent_folder_id"] = None  # 루트로 이동
            else:
                update_fields["parent_folder_id"] = ObjectId(folder.parent_folder_id)
        
        # 업데이트할 필드가 있을 때만 실행
        if update_fields:
            result = db.folders.update_one(
                {"_id": ObjectId(folder_id), "owner_id": user_id}, 
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                return {
                    "message": "폴더가 수정되었습니다",
                    "folder_id": folder_id,
                    "success": True
                }
            else:
                raise HTTPException(status_code=404, detail="폴더를 찾을 수 없거나 권한이 없습니다")
        else:
            raise HTTPException(status_code=400, detail="수정할 데이터가 없습니다")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/folders/")
async def create_folder(folder: FolderCreate, authorization: Optional[str] = Header(None), db: Database = Depends(get_database)):
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Unauthorized")
        
        user_id = get_user_id(authorization, db)
        folder_data = folder.model_dump()
        if folder_data.get("parent_folder_id"):
            folder_data["parent_folder_id"] = ObjectId(folder_data["parent_folder_id"])
        folder_data["owner_id"] = user_id
        result = db.folders.insert_one(folder_data)

        # 응답용 데이터 준비 (ObjectId → 문자열 변환)
        response_data = folder_data.copy()
        response_data["_id"] = str(result.inserted_id)
        response_data["owner_id"] = str(response_data["owner_id"])
        if response_data["parent_folder_id"]:
            response_data["parent_folder_id"] = str(response_data["parent_folder_id"])
        
        return {"folder": response_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")