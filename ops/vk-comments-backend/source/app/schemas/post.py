from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class PostOut(BaseModel):
    id: int
    external_post_id: int
    source: str
    title: Optional[str] = None
    author_name: Optional[str] = None
    published_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
