from fastapi import HTTPException
from pymongo.database import Database
from app.utilities.jwt import verify_token

def get_user_id(authorization: str, db: Database) -> int:    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
        
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    payload_user_email = payload.get("email")
    user = db.users.find_one({"email": payload_user_email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user["_id"]