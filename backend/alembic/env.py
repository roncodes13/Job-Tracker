from logging.config import fileConfig

from sqlalchemy import Connection, create_engine, make_url, pool

from alembic import context
from app import models  # noqa: F401
from app.core.config import settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        do_run_migrations(connection)
        return

    connect_args = (
        {"connect_timeout": 5}
        if make_url(settings.database_url).get_backend_name() == "postgresql"
        else {}
    )
    connectable = create_engine(
        settings.database_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )
    with connectable.connect() as migration_connection:
        do_run_migrations(migration_connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
