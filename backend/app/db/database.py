from typing import Optional, Any
from flask import current_app, g
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, Connection, Result
from sqlalchemy.exc import SQLAlchemyError


def _build_database_url() -> str:
    """Build the PostgreSQL connection URL from app config."""
    username = current_app.config["DB_USERNAME"]
    password = current_app.config["DB_PASSWORD"]
    host = current_app.config["DB_HOST"]
    port = current_app.config["DB_PORT"]
    database = current_app.config["DB_NAME"]
    return f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}"


def get_engine() -> Engine:
    """Return a singleton SQLAlchemy engine stored in Flask's `g` context."""
    if "db_engine" not in g:
        g.db_engine = create_engine(
            _build_database_url(),
            pool_pre_ping=True,
            future=True,
        )
    return g.db_engine  # type: ignore[return-value]


def get_connection() -> Connection:
    """Return a persistent connection stored in Flask's `g` context."""
    if "db_conn" not in g:
        g.db_conn = get_engine().connect()
    return g.db_conn  # type: ignore[return-value]


def close_db(_: Optional[BaseException] = None) -> None:
    """Close connection and dispose engine on app teardown."""
    conn: Optional[Connection] = g.pop("db_conn", None)
    if conn is not None:
        conn.close()

    engine: Optional[Engine] = g.pop("db_engine", None)
    if engine is not None:
        engine.dispose()


def execute_sql(sql, params: Optional[dict] = None) -> Optional[Result]:
    """
    Execute raw SQL (string or SQLAlchemy TextClause) with optional parameters.
    Commits automatically for modifying queries.
    """
    try:
        conn = get_connection()

        if isinstance(sql, str):
            sql = text(sql)

        result = conn.execute(sql, params or {})

        if sql.text.strip().lower().startswith((
            "insert", "update", "delete", "create", "drop", "alter"
        )):
            conn.commit()

        return result
    except SQLAlchemyError as e:
        current_app.logger.error(f"SQL execution failed: {e}")
        return None

