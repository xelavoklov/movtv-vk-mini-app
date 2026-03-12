from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("app_users.id"), nullable=False
    )
    parent_comment_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="published", server_default="published")
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    post: Mapped["Post"] = relationship(back_populates="comments")  # noqa: F821
    user: Mapped["AppUser"] = relationship(back_populates="comments")  # noqa: F821
    parent: Mapped[Optional["Comment"]] = relationship(
        back_populates="replies", remote_side="Comment.id"
    )
    replies: Mapped[list["Comment"]] = relationship(back_populates="parent")
    reactions: Mapped[list["CommentReaction"]] = relationship(back_populates="comment")  # noqa: F821

    __table_args__ = (
        Index("ix_comments_post_id_created_at", "post_id", "created_at"),
        Index("ix_comments_parent_comment_id_created_at", "parent_comment_id", "created_at"),
        Index("ix_comments_user_id_created_at", "user_id", "created_at"),
        Index("ix_comments_status_created_at", "status", "created_at"),
    )
