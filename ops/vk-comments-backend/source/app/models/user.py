from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vk_user_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    first_name: Mapped[str] = mapped_column(Text, nullable=False)
    last_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    screen_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo_100: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    comments: Mapped[list["Comment"]] = relationship(back_populates="user")  # noqa: F821
    reactions: Mapped[list["CommentReaction"]] = relationship(back_populates="user")  # noqa: F821

    __table_args__ = (Index("ix_app_users_vk_user_id", "vk_user_id"),)
