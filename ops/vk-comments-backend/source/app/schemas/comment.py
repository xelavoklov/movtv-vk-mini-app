from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.auth import UserOut


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


class CommentUpdate(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


class ReactionOut(BaseModel):
    id: int
    comment_id: int
    user_id: int
    reaction_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: int
    post_id: int
    parent_comment_id: Optional[int] = None
    body: str
    status: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    user: UserOut
    likes_count: int = 0
    replies_count: int = 0
    is_liked_by_me: bool = False

    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    items: List[CommentOut]
    total: int
    limit: int
    offset: int
