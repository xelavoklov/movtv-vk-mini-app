from datetime import date, timedelta, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.comment import Comment
from app.models.post import Post
from app.models.post_view import PostView
from app.models.reaction import CommentReaction
from app.models.user import AppUser
from app.schemas.comment import CommentCreate, CommentListResponse, CommentOut
from app.schemas.post import PostStatsOut
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


async def _get_post_stats(db: AsyncSession, post_id: int) -> PostStatsOut:
    """Return view counters for a post."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    total_result = await db.execute(
        select(func.count()).where(PostView.post_id == post_id)
    )
    views_total = total_result.scalar_one()

    unique_result = await db.execute(
        select(func.count(PostView.user_id.distinct())).where(
            PostView.post_id == post_id,
            PostView.viewed_at >= seven_days_ago,
        )
    )
    viewers_unique_7d = unique_result.scalar_one()

    return PostStatsOut(views_total=views_total, viewers_unique_7d=viewers_unique_7d)


@router.post(
    "/posts/{externalPostId}/view",
    response_model=PostStatsOut,
    status_code=status.HTTP_200_OK,
    summary="Засчитать просмотр поста",
)
async def record_post_view(
    externalPostId: int,
    db: AsyncSession = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    """
    Записывает просмотр поста текущим пользователем.

    Дедупликация: один пользователь может засчитать не более одного просмотра
    на один пост за одну ISO-календарную неделю (≈7 дней).
    Использует INSERT … ON CONFLICT DO NOTHING, безопасно при параллельных запросах.
    Возвращает актуальные счётчики поста.
    """
    post = await _get_or_404_post(db, externalPostId)

    # ISO week start (Monday) as the dedup bucket
    today = date.today()
    week_bucket = today - timedelta(days=today.weekday())

    stmt = (
        pg_insert(PostView)
        .values(
            post_id=post.id,
            user_id=current_user.id,
            week_bucket=week_bucket,
        )
        .on_conflict_do_nothing(
            index_elements=["post_id", "user_id", "week_bucket"]
        )
    )
    await db.execute(stmt)
    await db.commit()

    return await _get_post_stats(db, post.id)


@router.get(
    "/posts/{externalPostId}/stats",
    response_model=PostStatsOut,
    summary="Получить счётчики просмотров поста",
)
async def get_post_stats(
    externalPostId: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает счётчики просмотров поста без записи нового просмотра.
    Доступен без авторизации.
    """
    post = await _get_or_404_post(db, externalPostId)
    return await _get_post_stats(db, post.id)
