from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    external_post_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    source: Mapped[str] = mapped_column(Text, default="movtv", server_default="movtv")
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    author_name: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    raw_payload: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )

    comments: Mapped[list["Comment"]] = relationship(back_populates="post")  # noqa: F821

    __table_args__ = (Index("ix_posts_external_post_id", "external_post_id"),)
