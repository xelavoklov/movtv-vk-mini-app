import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Monkeypatch create_async_engine so importing app.database doesn't fail
# when asyncpg is absent (e.g. during local migration runs without asyncpg).
import sqlalchemy.ext.asyncio as _async_mod  # noqa: E402

_orig_create_async = _async_mod.create_async_engine


def _stub_async_engine(url, **kw):
    class _Stub:
        pass
    return _Stub()


_async_mod.create_async_engine = _stub_async_engine

from app.database import Base  # noqa: E402
import app.models  # noqa: E402, F401 — registers models on Base.metadata

_async_mod.create_async_engine = _orig_create_async  # restore

config = context.config

# Build sync URL: prefer SYNC_DATABASE_URL env, then derive from individual vars
from app.config import get_settings  # noqa: E402

_s = get_settings()
_sync_url = (
    os.environ.get("SYNC_DATABASE_URL")
    or os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg", "postgresql+psycopg2")
    or _s.SYNC_DATABASE_URL
)
config.set_main_option("sqlalchemy.url", _sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
