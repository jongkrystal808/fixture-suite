from fastapi import APIRouter, HTTPException, status

router = APIRouter(
    prefix="/users",
    tags=["使用者管理 Users"]
)

@router.get("/", summary="取得使用者清單")
async def list_users():
    return [{"id": 1, "username": "admin", "role": "admin"}]


@router.post("/")
async def create_user(user: dict):
    return user

@router.put("/{user_id}")
async def update_user(user_id: str, user: dict):
    return user

@router.delete("/{user_id}")
async def delete_user(user_id: str, password: str):
    return {"deleted": True}
