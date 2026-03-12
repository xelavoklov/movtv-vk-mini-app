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


@router.post(
    "/{commentId}/replies",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Ответить на комментарий",
)
async def reply_to_comment(
    commentId: int,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    parent = await _get_comment_or_404(db, commentId)

    reply = Comment(
        post_id=parent.post_id,
        user_id=current_user.id,
        parent_comment_id=parent.id,
        body=body.body,
    )
    db.add(reply)
    await db.flush()

    result = await db.execute(
        select(Comment).where(Comment.id == reply.id).options(selectinload(Comment.user))
    )
    reply = result.scalar_one()
    await db.commit()

    items = await _enrich_comments([reply], db, current_user)
    return items[0]


@router.patch(
    "/{commentId}",
    response_model=CommentOut,
    summary="Редактировать комментарий",
)
async def update_comment(
    commentId: int,
    body: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    comment = await _get_comment_or_404(db, commentId)

    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    comment.body = body.body
    comment.is_edited = True
    await db.flush()
    await db.commit()

    await db.refresh(comment)
    items = await _enrich_comments([comment], db, current_user)
    return items[0]


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


@router.post(
    "/{commentId}/like",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Поставить лайк",
)
async def like_comment(
    commentId: int,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    await _get_comment_or_404(db, commentId)

    exists = await db.execute(
        select(CommentReaction).where(
            CommentReaction.comment_id == commentId,
            CommentReaction.user_id == current_user.id,
            CommentReaction.reaction_type == "like",
        )
    )
    if exists.scalar_one_or_none() is not None:
        return  # idempotent

    reaction = CommentReaction(
        comment_id=commentId,
        user_id=current_user.id,
        reaction_type="like",
    )
    db.add(reaction)
    await db.commit()


@router.delete(
    "/{commentId}/like",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Убрать лайк",
)
async def unlike_comment(
    commentId: int,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    await _get_comment_or_404(db, commentId)

    result = await db.execute(
        select(CommentReaction).where(
            CommentReaction.comment_id == commentId,
            CommentReaction.user_id == current_user.id,
            CommentReaction.reaction_type == "like",
        )
    )
    reaction = result.scalar_one_or_none()
    if reaction:
        await db.delete(reaction)
        await db.commit()
