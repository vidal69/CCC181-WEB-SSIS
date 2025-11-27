"""Base model utilities used by concrete model classes.

This module provides a small, focused set of helpers used across
the project's data models: execution wrapper with standardized
database error conversion, required-field validation and helpers
to construct WHERE / ORDER BY / LIMIT clauses used by the
search APIs.
"""

from typing import Any, Dict, List, Optional, Tuple, TypeVar, Generic
from abc import ABC, abstractmethod
from db.database import execute_sql
import logging

T = TypeVar("T")

logger = logging.getLogger(__name__)


class ModelError(Exception):
    """Base exception for model-related errors."""

    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(ModelError):
    """Raised when data validation fails."""


class DatabaseError(ModelError):
    """Raised when database operations fail."""


class NotFoundError(ModelError):
    """Raised when a record is not found."""


class BaseModel(ABC, Generic[T]):
    """Abstract base for all models with common DB helpers."""

    @property
    @abstractmethod
    def table_name(self) -> str:
        """Database table name for this model."""

    @property
    @abstractmethod
    def primary_key(self) -> str:
        """Primary key column for this model."""

    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Serialize instance to a dictionary."""

    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> "BaseModel":
        """Instantiate model from a mapping (DB row or payload)."""

    def _execute_query(self, query: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """Run a query and convert unexpected errors to DatabaseError."""
        try:
            return execute_sql(query, params or {})
        except Exception as exc:
            logger.exception("Database query failed")
            raise DatabaseError(
                f"Database operation failed: {str(exc)}",
                error_code="DATABASE_ERROR",
                details={"query": query, "params": params},
            )

    def _validate_required_fields(self, data: Dict[str, Any], required_fields: List[str]) -> None:
        """Ensure required fields exist and are non-empty in `data`."""
        missing = [f for f in required_fields if f not in data or data[f] is None or data[f] == ""]
        if missing:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing)}",
                error_code="MISSING_REQUIRED_FIELDS",
                details={"missing_fields": missing},
            )

    def _build_search_filter(self, search_by: str, search_term: str, allowed_fields: List[str]) -> Tuple[str, Dict[str, Any]]:
        """Return a SQL WHERE clause and params for the given search input.

        If `search_by` is provided and allowed, performs a single-field
        ILIKE search. Otherwise tokenizes the term and searches across
        multiple fields.
        """
        if not search_term or not search_term.strip():
            return "", {}

        search_term = search_term.strip()
        params: Dict[str, Any] = {}

        if search_by and search_by in allowed_fields:
            return self._build_single_field_filter(search_by, search_term, params)

        return self._build_tokenized_search_filter(search_term, allowed_fields, params)

    def _build_single_field_filter(self, field: str, search_term: str, params: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        param = f"search_{field}"
        params[param] = f"%{search_term}%"
        return f"WHERE {field} ILIKE :{param}", params

    def _build_tokenized_search_filter(self, search_term: str, allowed_fields: List[str], params: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        tokens = [t for t in (s.strip() for s in search_term.split()) if t]
        if not tokens:
            return "", {}

        # Only attempt tokenized search on fields that are both searchable
        # and allowed by the caller.
        default_search_fields = ["first_name", "last_name", "id_number", "program_code"]
        searchable = [f for f in default_search_fields if f in allowed_fields]
        if not searchable:
            return "", {}

        conditions: List[str] = []
        idx = 0
        for token in tokens:
            or_parts: List[str] = []
            for field in searchable:
                key = f"token_{idx}"
                params[key] = f"%{token}%"
                or_parts.append(f"{field} ILIKE :{key}")
                idx += 1

            if or_parts:
                conditions.append(f"({' OR '.join(or_parts)})")

        if not conditions:
            return "", {}

        return "WHERE " + " AND ".join(conditions), params

    def _build_sort_clause(self, sort_by: str, sort_order: str, allowed_sort_fields: List[str]) -> str:
        if sort_by not in allowed_sort_fields:
            sort_by = allowed_sort_fields[0]

        order = sort_order.upper() if sort_order and sort_order.upper() in ("ASC", "DESC") else "ASC"

        # Add helpful secondary ordering for student-like records
        is_student_like = all(f in allowed_sort_fields for f in ("id_number", "first_name", "last_name"))

        if is_student_like:
            if sort_by == "last_name":
                fields = [(sort_by, order), ("first_name", "ASC")]
            else:
                fields = [(sort_by, order), ("last_name", "ASC"), ("first_name", "ASC")]
        else:
            fields = [(sort_by, order)]

        sort_clause = ", ".join(f"{f} {o}" for f, o in fields if f in allowed_sort_fields)
        return f"ORDER BY {sort_clause}"

    def _build_pagination_clause(self, limit: int, offset: int) -> str:
        return f"LIMIT {limit} OFFSET {offset}"

