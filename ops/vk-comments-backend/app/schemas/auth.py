from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class VKAuthRequest(BaseModel):
    """Raw query string from VK Mini App launch params."""
    launch_params: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    screen_name: Optional[str] = None
    photo_100: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    vk_user_id: int
    first_name: str
    last_name: Optional[str] = None
    photo_100: Optional[str] = None
    is_admin: bool = False


class UserOut(BaseModel):
    id: int
    vk_user_id: int
    first_name: str
    last_name: Optional[str] = None
    screen_name: Optional[str] = None
    photo_100: Optional[str] = None

    model_config = {"from_attributes": True}
