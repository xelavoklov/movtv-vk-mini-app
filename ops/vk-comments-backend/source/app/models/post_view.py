from datetime import date, datetime

from sqlalchemy import BigInteger, Date, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PostView(Base):
    __tablename__ = "post_views"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False
    )
    viewed_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    # ISO week start (Monday) used as dedup bucket: one view per user/post per calendar week.
    # The unique constraint ensures race-condition-safe upsert via ON CONFLICT DO NOTHING.
    week_bucket: Mapped[date] = mapped_column(Date, nullable=False)

    post: Mapped["Post"] = relationship()  # noqa: F821
    user: Mapped["AppUser"] = relationship()  # noqa: F821

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", "week_bucket", name="uq_post_views_post_user_week"),
        Index("ix_post_views_post_id", "post_id"),
        Index("ix_post_views_user_id_viewed_at", "user_id", "viewed_at"),
    )
