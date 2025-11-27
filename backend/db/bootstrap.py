from pathlib import Path
from typing import List
import logging

from .database import execute_sql
from werkzeug.security import generate_password_hash

logger = logging.getLogger(__name__)


def _core_tables_exist() -> bool:
    """Return True if at least one of the core tables exists."""
    result = execute_sql(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('students', 'colleges', 'programs')
            LIMIT 1
        ) AS tables_exist;
        """
    )

    return bool(result and result.scalar())


def _load_schema(path: Path) -> List[str]:
    """Read SQL file and split into executable statements.

    This is intentionally simplistic (split on ';') to match original behavior.
    """
    text = path.read_text(encoding="utf-8")
    return [s.strip() for s in text.split(";") if s.strip()]


def bootstrap() -> None:
    """Ensure DB schema exists; if not, execute schema and create default admin.

    Behavior preserved from original implementation; only logging and helpers
    are introduced for clarity.
    """
    if _core_tables_exist():
        logger.info("Database tables already exist, skipping bootstrap")
        return

    logger.info("Bootstrapping database schema...")

    schema_path = Path(__file__).parent / "schema.sql"
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    try:
        statements = _load_schema(schema_path)
        for idx, stmt in enumerate(statements, start=1):
            logger.info("Executing statement %d/%d", idx, len(statements))
            execute_sql(stmt)

        # Create default admin user with hashed password
        logger.info("Creating default admin user...")
        password_hash = generate_password_hash("admin")

        execute_sql(
            """
            INSERT INTO users (username, email, password_hash, role)
            VALUES (:username, :email, :password_hash, :role)
            ON CONFLICT (username) DO NOTHING
            """,
            {
                "username": "admin",
                "email": "admin@gmail.com",
                "password_hash": password_hash,
                "role": "admin",
            },
        )

        # Check whether the admin account exists now
        admin_check = execute_sql("SELECT user_id FROM users WHERE username = 'admin'")
        if admin_check and admin_check.scalar():
            logger.info("Default admin user present (username=admin)")
        else:
            logger.warning("Default admin may not have been created; it may already exist")

        logger.info("Database schema bootstrap completed")

    except Exception:
        logger.exception("Error bootstrapping schema")
        raise


# Backwards-compatible alias: some callers import a different name
bootstrap_schema_if_needed = bootstrap