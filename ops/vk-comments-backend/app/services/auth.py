from datetime import datetime, timezone, timedelta
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import AppUser

settings = get_settings()
bearer_scheme = HTTPBearer()


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(seconds=settings.JWT_EXPIRE_SECONDS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user_id


async def get_or_create_user(
    db: AsyncSession,
    vk_user_id: int,
    first_name: str,
    last_name: Optional[str],
    screen_name: Optional[str],
    photo_100: Optional[str],
) -> AppUser:
    result = await db.execute(select(AppUser).where(AppUser.vk_user_id == vk_user_id))
    user = result.scalar_one_or_none()

    now = datetime.utcnow()
    normalized_first_name = (first_name or "").strip()
    normalized_last_name = (last_name or "").strip() or None
    normalized_screen_name = (screen_name or "").strip() or None
    normalized_photo_100 = (photo_100 or "").strip() or None

    if user is None:
        user = AppUser(
            vk_user_id=vk_user_id,
            first_name=normalized_first_name or normalized_screen_name or f"VK {vk_user_id}",
            last_name=normalized_last_name,
            screen_name=normalized_screen_name,
            photo_100=normalized_photo_100,
            last_seen_at=now,
        )
        db.add(user)
        await db.flush()
    else:
        if normalized_first_name:
            user.first_name = normalized_first_name
        if normalized_last_name is not None:
            user.last_name = normalized_last_name
        if normalized_screen_name is not None:
            user.screen_name = normalized_screen_name
        if normalized_photo_100 is not None:
            user.photo_100 = normalized_photo_100
        user.last_seen_at = now
        await db.flush()

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> AppUser:
    user_id = decode_token(credentials.credentials)
    result = await db.execute(select(AppUser).where(AppUser.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is banned")
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    ),
    db: AsyncSession = Depends(get_db),
) -> Optional[AppUser]:
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
