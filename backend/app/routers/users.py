from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def list_users():
    return []

@router.post("/")
async def create_user(user: dict):
    return user

@router.put("/{user_id}")
async def update_user(user_id: str, user: dict):
    return user

@router.delete("/{user_id}")
async def delete_user(user_id: str, password: str):
    return {"deleted": True}
