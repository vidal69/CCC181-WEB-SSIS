"""
Base model class providing common database operations and error handling.
"""
from typing import Dict, Any, List, Optional, TypeVar, Generic, Tuple
from abc import ABC, abstractmethod
from ..db.database import execute_sql
import logging

T = TypeVar('T')

logger = logging.getLogger(__name__)


class ModelError(Exception):
    """Base exception for model-related errors."""
    def __init__(self, message: str, error_code: str = None, details: Dict[str, Any] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(ModelError):
    """Raised when data validation fails."""
    pass


class DatabaseError(ModelError):
    """Raised when database operations fail."""
    pass


class NotFoundError(ModelError):
    """Raised when a record is not found."""
    pass


class BaseModel(ABC, Generic[T]):
    """Base model class with common database operations."""
    
    @property
    @abstractmethod
    def table_name(self) -> str:
        """Return the database table name for this model."""
        pass
    
    @property
    @abstractmethod
    def primary_key(self) -> str:
        """Return the primary key column name."""
        pass
    
    @abstractmethod
    def to_dict(self) -> Dict[str, Any]:
        """Convert model instance to dictionary."""
        pass
    
    @classmethod
    @abstractmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseModel':
        """Create model instance from dictionary."""
        pass
    
    def _execute_query(self, query: str, params: Dict[str, Any] = None) -> Any:
        """Execute a database query with error handling."""
        try:
            result = execute_sql(query, params or {})
            return result
        except Exception as e:
            logger.error(f"Database query failed: {query}, params: {params}, error: {str(e)}")
            raise DatabaseError(
                f"Database operation failed: {str(e)}",
                error_code="DATABASE_ERROR",
                details={"query": query, "params": params}
            )
    
    def _validate_required_fields(self, data: Dict[str, Any], required_fields: List[str]) -> None:
        """Validate that all required fields are present and not empty."""
        missing_fields = []
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                missing_fields.append(field)
        
        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}",
                error_code="MISSING_REQUIRED_FIELDS",
                details={"missing_fields": missing_fields}
            )
    
    def _build_search_filter(self, search_by: str, search_term: str, allowed_fields: List[str]) -> Tuple[str, Dict]:
        """Build search filter with support for tokenized multi-field search."""
        if not search_term or not search_term.strip():
            return "", {}
        
        search_term = search_term.strip()
        params = {}
        
        # If a specific field is specified, use traditional search
        if search_by and search_by in allowed_fields:
            return self._build_single_field_filter(search_by, search_term, params)
        
        # Otherwise, use tokenized search across multiple fields
        return self._build_tokenized_search_filter(search_term, allowed_fields, params)
    
    def _build_single_field_filter(self, field: str, search_term: str, params: Dict) -> Tuple[str, Dict]:
        """Build filter for a single field."""
        param_name = f"search_{field}"
        params[param_name] = f"%{search_term}%"
        # Use ILIKE for case-insensitive search (PostgreSQL)
        return f"WHERE {field} ILIKE :{param_name}", params

    def _build_tokenized_search_filter(self, search_term: str, allowed_fields: List[str], params: Dict) -> Tuple[str, Dict]:
        """Build tokenized search filter that searches each term across multiple fields."""
        # Split search term into individual words/tokens
        tokens = [token.strip() for token in search_term.split() if token.strip()]
        
        if not tokens:
            return "", {}
        
        # Define which fields to search for tokenized queries
        searchable_fields = ["first_name", "last_name", "id_number", "program_code"]
        
        conditions = []
        param_index = 0
        
        # For each token, create OR conditions across all searchable fields
        for i, token in enumerate(tokens):
            token_conditions = []
            for field in searchable_fields:
                if field in allowed_fields:
                    param_name = f"token_{param_index}"
                    params[param_name] = f"%{token}%"
                    # Use ILIKE for case-insensitive search (PostgreSQL)
                    token_conditions.append(f"{field} ILIKE :{param_name}")
                    param_index += 1
            
            if token_conditions:
                # All field conditions for this token are OR'd together
                conditions.append(f"({' OR '.join(token_conditions)})")
        
        if not conditions:
            return "", {}
        
        # All token conditions are AND'd together
        where_clause = "WHERE " + " AND ".join(conditions)
        return where_clause, params
    
    def _build_sort_clause(self, sort_by: str, sort_order: str, allowed_sort_fields: List[str]) -> str:
        """Build ORDER BY clause with context-aware secondary sorting rules."""
        if sort_by not in allowed_sort_fields:
            sort_by = allowed_sort_fields[0]

        if sort_order.upper() not in ["ASC", "DESC"]:
            sort_order = "ASC"
        else:
            sort_order = sort_order.upper()

        # Determine model type by checking primary identifying fields
        has_student_fields = all(field in allowed_sort_fields for field in ["id_number", "first_name", "last_name"])
        has_program_fields = all(field in allowed_sort_fields for field in ["program_code", "program_name", "college_code"])
        has_college_fields = all(field in allowed_sort_fields for field in ["college_code", "college_name"])

        sort_fields = []

        if has_student_fields:
            if sort_by == "last_name":
                sort_fields = [(sort_by, sort_order), ("first_name", "ASC")]
            else:
                sort_fields = [(sort_by, sort_order), ("last_name", "ASC"), ("first_name", "ASC")]

        elif has_program_fields:
            sort_fields = [(sort_by, sort_order)]

        elif has_college_fields:
            sort_fields = [(sort_by, sort_order)]

        else:
            sort_fields = [(sort_by, sort_order)]

        sort_clause = ", ".join(f"{field} {order}" for field, order in sort_fields if field in allowed_sort_fields)
        return f"ORDER BY {sort_clause}"
    
    def _build_pagination_clause(self, limit: int, offset: int) -> str:
        """Build LIMIT and OFFSET clause."""
        return f"LIMIT {limit} OFFSET {offset}"

