from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Index, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CommentReaction(Base):
    __tablename__ = "comment_reactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    comment_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("comments.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("app_users.id", ondelete="CASCADE"), nullable=False
    )
    reaction_type: Mapped[str] = mapped_column(Text, default="like", server_default="like")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    comment: Mapped["Comment"] = relationship(back_populates="reactions")  # noqa: F821
    user: Mapped["AppUser"] = relationship(back_populates="reactions")  # noqa: F821

    __table_args__ = (
        UniqueConstraint("comment_id", "user_id", "reaction_type", name="uq_comment_reactions"),
        Index("ix_comment_reactions_comment_id", "comment_id"),
    )
