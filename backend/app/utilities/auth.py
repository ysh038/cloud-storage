from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.model.user import User
from app.utilities.jwt import verify_token

async def get_user_id(authorization: str, db: AsyncSession) -> int:    
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
        
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    payload_user_email = payload.get("email")
    query = select(User).where(User.email == payload_user_email)
    result = await db.execute(query)
    user = result.scalars().first()
    user_id = user.id
    return user_id