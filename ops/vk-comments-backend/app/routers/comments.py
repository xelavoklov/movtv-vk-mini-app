from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.comment import Comment
from app.models.reaction import CommentReaction
from app.models.user import AppUser
from app.routers.posts import _enrich_comments
from app.schemas.comment import CommentCreate, CommentOut, CommentUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/comments", tags=["comments"])


async def _get_comment_or_404(db: AsyncSession, comment_id: int) -> Comment:
    result = await db.execute(
        select(Comment)
        .where(Comment.id == comment_id, Comment.deleted_at.is_(None))
        .options(selectinload(Comment.user))
    )
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


@router.delete(
    "/{commentId}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить комментарий (soft delete)",
)
async def delete_comment(
    commentId: int,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    comment = await _get_comment_or_404(db, commentId)

    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    comment.deleted_at = datetime.utcnow()
    comment.status = "deleted"
    await db.commit()
