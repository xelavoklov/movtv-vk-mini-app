from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth_router, posts_router, comments_router

settings = get_settings()

app = FastAPI(
    title="VK Mini App Comments API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(posts_router, prefix="/api/v1")
app.include_router(comments_router, prefix="/api/v1")


@app.get("/healthz", tags=["health"])
async def healthcheck():
    return {"status": "ok"}
