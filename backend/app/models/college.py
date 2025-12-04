"""
College model for college management.
"""
from typing import Dict, Any, List, Optional, Tuple
from .base_model import BaseModel, ValidationError, DatabaseError, NotFoundError


class College(BaseModel):
    """College model for college management."""
    
    def __init__(self, college_code: str = "", college_name: str = ""):
        self.college_code = college_code
        self.college_name = college_name
    
    @property
    def table_name(self) -> str:
        return "colleges"
    
    @property
    def primary_key(self) -> str:
        return "college_code"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert college instance to dictionary."""
        return {
            "college_code": self.college_code,
            "college_name": self.college_name
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'College':
        """Create college instance from dictionary."""
        return cls(
            college_code=data.get("college_code", ""),
            college_name=data.get("college_name", "")
        )
    
    def validate(self) -> None:
        """Validate college data."""
        required_fields = ["college_code", "college_name"]
        self._validate_required_fields(self.to_dict(), required_fields)
        
        if not self.college_code.strip():
            raise ValidationError(
                "College code cannot be empty",
                error_code="EMPTY_COLLEGE_CODE"
            )
        
        if not self.college_name.strip():
            raise ValidationError(
                "College name cannot be empty",
                error_code="EMPTY_COLLEGE_NAME"
            )
        
        if len(self.college_code) > 20:
            raise ValidationError(
                "College code cannot exceed 20 characters",
                error_code="COLLEGE_CODE_TOO_LONG"
            )
        
        if len(self.college_name) > 50:
            raise ValidationError(
                "College name cannot exceed 50 characters",
                error_code="COLLEGE_NAME_TOO_LONG"
            )
    
    def save(self) -> 'College':
        """Save college to database."""
        self.validate()
        
        # Check for duplicate college code
        if self._code_exists(self.college_code):
            raise ValidationError(
                f"College code '{self.college_code}' already exists",
                error_code="COLLEGE_CODE_EXISTS"
            )
        
        result = self._execute_query(
            """
            INSERT INTO colleges (college_code, college_name)
            VALUES (:college_code, :college_name)
            """,
            {
                "college_code": self.college_code,
                "college_name": self.college_name
            }
        )
        
        if not result:
            raise DatabaseError(
                "Failed to create college",
                error_code="COLLEGE_CREATION_FAILED"
            )
        
        return self
    
    def update(self, updates: Dict[str, Any]) -> 'College':
        """Update college with new data."""
        allowed_fields = {"college_code", "college_name"}
        set_items = []
        params = {"orig_college_code": self.college_code}
        
        # Validate updates
        for field, value in updates.items():
            if field not in allowed_fields:
                continue
            
            if field == "college_code" and value != self.college_code:
                # Check if new code already exists
                if self._code_exists(value):
                    raise ValidationError(
                        f"College code '{value}' already exists",
                        error_code="COLLEGE_CODE_EXISTS"
                    )
            
            set_items.append(f"{field} = :{field}")
            params[field] = value
        
        if not set_items:
            raise ValidationError(
                "No valid fields to update",
                error_code="NO_UPDATE_FIELDS"
            )
        
        result = self._execute_query(
            f"UPDATE colleges SET {', '.join(set_items)} WHERE college_code = :orig_college_code",
            params
        )
        
        if not result or result.rowcount == 0:
            raise NotFoundError(
                f"College with code '{self.college_code}' not found",
                error_code="COLLEGE_NOT_FOUND"
            )
        
        # Update instance with new values
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(self, field, value)
        
        return self
    
    def delete(self) -> bool:
        """Delete college from database."""
        if not self.college_code:
            raise ValidationError(
                "Cannot delete college without code",
                error_code="NO_COLLEGE_CODE"
            )
        
        result = self._execute_query(
            "DELETE FROM colleges WHERE college_code = :college_code",
            {"college_code": self.college_code}
        )
        
        return bool(result and result.rowcount > 0)
    
    def _code_exists(self, college_code: str) -> bool:
        """Check if college code already exists."""
        result = self._execute_query(
            "SELECT 1 FROM colleges WHERE college_code = :college_code",
            {"college_code": college_code}
        )
        return result.scalar() is not None if result else False
    
    def _count_programs(self) -> int:
        """Count programs associated with this college."""
        result = self._execute_query(
            "SELECT COUNT(*) FROM programs WHERE college_code = :college_code",
            {"college_code": self.college_code}
        )
        return result.scalar() or 0
    
    @classmethod
    def find_by_code(cls, college_code: str) -> Optional['College']:
        """Find college by code."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT college_code, college_name
            FROM colleges
            WHERE college_code = :college_code
            """,
            {"college_code": college_code}
        )
        
        row = result.mappings().first() if result else None
        return cls.from_dict(dict(row)) if row else None
    
    @classmethod
    def search(cls, search_by: str = "", search_term: str = "", sort_by: str = "college_code", 
               sort_order: str = "ASC", page: int = 1, page_size: Optional[int] = 10) -> Tuple[List['College'], int]:
        """Search colleges with pagination."""
        # Validate sort field
        allowed_sort_fields = ["college_code", "college_name"]
        if sort_by not in allowed_sort_fields:
            sort_by = "college_code"
        
        # Validate search field
        allowed_search_fields = ["college_code", "college_name"]
        if search_by and search_by not in allowed_search_fields:
            search_by = ""
        
        # Build search filter
        instance = cls()
        filters, params = instance._build_search_filter(search_by, search_term, allowed_search_fields)
        
        # Build sort clause
        sort_clause = instance._build_sort_clause(sort_by, sort_order, allowed_sort_fields)
        
        # Build pagination
        if not page_size or page_size <= 0:
            pagination_clause = ""
        else:
            offset = (page - 1) * page_size
            pagination_clause = instance._build_pagination_clause(page_size, offset)
        
        # Execute search query
        query = f"""
            SELECT college_code, college_name
            FROM colleges
            {filters}
            {sort_clause}
            {pagination_clause}
        """
        
        result = instance._execute_query(query, params)
        colleges = [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM colleges {filters}"
        count_result = instance._execute_query(count_query, params)
        total_count = count_result.scalar() or 0
        
        return colleges, total_count
    
    @classmethod
    def get_all(cls) -> List['College']:
        """Get all colleges."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT college_code, college_name
            FROM colleges
            ORDER BY college_code
            """
        )
        
        return [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
