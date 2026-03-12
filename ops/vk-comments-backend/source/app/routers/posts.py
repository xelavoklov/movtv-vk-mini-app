from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.comment import Comment
from app.models.post import Post
from app.models.reaction import CommentReaction
from app.models.user import AppUser
from app.schemas.comment import CommentCreate, CommentListResponse, CommentOut
from app.services.auth import get_current_user, get_current_user_optional

router = APIRouter(tags=["posts"])


async def _get_or_404_post(db: AsyncSession, external_post_id: int) -> Post:
    result = await db.execute(select(Post).where(Post.external_post_id == external_post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def _enrich_comments(
    comments: list[Comment],
    db: AsyncSession,
    current_user: AppUser | None,
) -> list[CommentOut]:
    if not comments:
        return []

    ids = [c.id for c in comments]

    # Likes counts
    likes_rows = await db.execute(
        select(CommentReaction.comment_id, func.count().label("cnt"))
        .where(CommentReaction.comment_id.in_(ids))
        .group_by(CommentReaction.comment_id)
    )
    likes_map = {row.comment_id: row.cnt for row in likes_rows}

    # Replies counts
    replies_rows = await db.execute(
        select(Comment.parent_comment_id, func.count().label("cnt"))
        .where(Comment.parent_comment_id.in_(ids), Comment.deleted_at.is_(None))
        .group_by(Comment.parent_comment_id)
    )
    replies_map = {row.parent_comment_id: row.cnt for row in replies_rows}

    # Current user likes
    liked_ids: set[int] = set()
    if current_user:
        liked_rows = await db.execute(
            select(CommentReaction.comment_id).where(
                CommentReaction.comment_id.in_(ids),
                CommentReaction.user_id == current_user.id,
                CommentReaction.reaction_type == "like",
            )
        )
        liked_ids = {row.comment_id for row in liked_rows}

    out = []
    for c in comments:
        out.append(
            CommentOut(
                id=c.id,
                post_id=c.post_id,
                parent_comment_id=c.parent_comment_id,
                body=c.body,
                status=c.status,
                is_edited=c.is_edited,
                created_at=c.created_at,
                updated_at=c.updated_at,
                user=c.user,
                likes_count=likes_map.get(c.id, 0),
                replies_count=replies_map.get(c.id, 0),
                is_liked_by_me=c.id in liked_ids,
            )
        )
    return out


@router.get(
    "/posts/{externalPostId}/comments",
    response_model=CommentListResponse,
    summary="Получить комментарии к посту",
)
async def list_comments(
    externalPostId: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: AppUser | None = Depends(get_current_user_optional),
):
    post = await _get_or_404_post(db, externalPostId)

    total_result = await db.execute(
        select(func.count())
        .where(
            Comment.post_id == post.id,
            Comment.parent_comment_id.is_(None),
            Comment.deleted_at.is_(None),
            Comment.status == "published",
        )
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(Comment)
        .where(
            Comment.post_id == post.id,
            Comment.parent_comment_id.is_(None),
            Comment.deleted_at.is_(None),
            Comment.status == "published",
        )
        .options(selectinload(Comment.user))
        .order_by(Comment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    comments = list(result.scalars())
    items = await _enrich_comments(comments, db, current_user)
    return CommentListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/posts/{externalPostId}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить комментарий к посту",
)
async def create_comment(
    externalPostId: int,
    body: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    post = await _get_or_404_post(db, externalPostId)

    comment = Comment(
        post_id=post.id,
        user_id=current_user.id,
        body=body.body,
    )
    db.add(comment)
    await db.flush()

    # Reload with user
    result = await db.execute(
        select(Comment).where(Comment.id == comment.id).options(selectinload(Comment.user))
    )
    comment = result.scalar_one()
    await db.commit()

    items = await _enrich_comments([comment], db, current_user)
    return items[0]
