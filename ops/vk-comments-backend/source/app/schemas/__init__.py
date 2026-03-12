from app.schemas.auth import VKAuthRequest, TokenResponse, UserOut
from app.schemas.post import PostOut
from app.schemas.comment import CommentCreate, CommentUpdate, CommentOut, CommentListResponse

__all__ = [
    "VKAuthRequest", "TokenResponse", "UserOut",
    "PostOut",
    "CommentCreate", "CommentUpdate", "CommentOut", "CommentListResponse",
]
