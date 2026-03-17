from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PostStatsOut(BaseModel):
    views_total: int
    viewers_unique_7d: int


class PostOut(BaseModel):
    id: int
    external_post_id: int
    source: str
    title: Optional[str] = None
    author_name: Optional[str] = None
    published_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
