from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import VKAuthRequest, TokenResponse
from app.services.vk import fetch_vk_user_profile, validate_vk_launch_params
from app.services.auth import get_or_create_user, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/vk", response_model=TokenResponse, summary="Авторизация через VK Mini App")
async def auth_vk(body: VKAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Принимает строку launch_params от VK Mini App, валидирует подпись HMAC-SHA256,
    создаёт или обновляет пользователя, возвращает JWT.
    """
    params = validate_vk_launch_params(body.launch_params)

    vk_user_id = int(params["vk_user_id"])
    profile = await fetch_vk_user_profile(vk_user_id)
    first_name = body.first_name or params.get("vk_user_first_name") or profile.get("first_name") or ""
    last_name = body.last_name or params.get("vk_user_last_name") or profile.get("last_name")
    screen_name = body.screen_name or params.get("vk_user_screen_name") or profile.get("screen_name")
    photo_100 = body.photo_100 or params.get("vk_user_photo_100") or profile.get("photo_100")

    user = await get_or_create_user(
        db=db,
        vk_user_id=vk_user_id,
        first_name=first_name,
        last_name=last_name,
        screen_name=screen_name,
        photo_100=photo_100,
    )
    await db.commit()

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        vk_user_id=user.vk_user_id,
        first_name=user.first_name,
        last_name=user.last_name,
        photo_100=user.photo_100,
        is_admin=user.is_admin,
    )
