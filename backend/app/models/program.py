"""
Program model for program management.
"""
from typing import Dict, Any, List, Optional, Tuple
from .base_model import BaseModel, ValidationError, DatabaseError, NotFoundError


class Program(BaseModel):
    """Program model for program management."""
    
    def __init__(self, program_code: str = "", program_name: str = "", college_code: str = ""):
        self.program_code = program_code
        self.program_name = program_name
        self.college_code = college_code
    
    @property
    def table_name(self) -> str:
        return "programs"
    
    @property
    def primary_key(self) -> str:
        return "program_code"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert program instance to dictionary."""
        return {
            "program_code": self.program_code,
            "program_name": self.program_name,
            "college_code": self.college_code
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Program':
        """Create program instance from dictionary."""
        return cls(
            program_code=data.get("program_code", ""),
            program_name=data.get("program_name", ""),
            college_code=data.get("college_code", "")
        )
    
    def validate(self) -> None:
        """Validate program data."""
        required_fields = ["program_code", "program_name", "college_code"]
        self._validate_required_fields(self.to_dict(), required_fields)
        
        if not self.program_code.strip():
            raise ValidationError(
                "Program code cannot be empty",
                error_code="EMPTY_PROGRAM_CODE"
            )
        
        if not self.program_name.strip():
            raise ValidationError(
                "Program name cannot be empty",
                error_code="EMPTY_PROGRAM_NAME"
            )
        
        if not self.college_code.strip():
            raise ValidationError(
                "College code cannot be empty",
                error_code="EMPTY_COLLEGE_CODE"
            )
        
        if len(self.program_code) > 20:
            raise ValidationError(
                "Program code cannot exceed 20 characters",
                error_code="PROGRAM_CODE_TOO_LONG"
            )
        
        if len(self.program_name) > 50:
            raise ValidationError(
                "Program name cannot exceed 50 characters",
                error_code="PROGRAM_NAME_TOO_LONG"
            )
        
        # Validate college exists
        if not self._college_exists(self.college_code):
            raise ValidationError(
                f"College with code '{self.college_code}' does not exist",
                error_code="COLLEGE_NOT_FOUND"
            )
    
    def save(self) -> 'Program':
        """Save program to database."""
        self.validate()
        
        # Check for duplicate program code
        if self._code_exists(self.program_code):
            raise ValidationError(
                f"Program code '{self.program_code}' already exists",
                error_code="PROGRAM_CODE_EXISTS"
            )
        
        result = self._execute_query(
            """
            INSERT INTO programs (program_code, program_name, college_code)
            VALUES (:program_code, :program_name, :college_code)
            """,
            {
                "program_code": self.program_code,
                "program_name": self.program_name,
                "college_code": self.college_code
            }
        )
        
        if not result:
            raise DatabaseError(
                "Failed to create program",
                error_code="PROGRAM_CREATION_FAILED"
            )
        
        return self
    
    def update(self, updates: Dict[str, Any]) -> 'Program':
        """Update program with new data."""
        allowed_fields = {"program_code", "program_name", "college_code"}
        set_items = []
        params = {"orig_program_code": self.program_code}
        
        # Validate updates
        for field, value in updates.items():
            if field not in allowed_fields:
                continue
            
            if field == "program_code" and value != self.program_code:
                # Check if new code already exists
                if self._code_exists(value):
                    raise ValidationError(
                        f"Program code '{value}' already exists",
                        error_code="PROGRAM_CODE_EXISTS"
                    )
            
            if field == "college_code" and value != self.college_code:
                # Validate new college exists
                if not self._college_exists(value):
                    raise ValidationError(
                        f"College with code '{value}' does not exist",
                        error_code="COLLEGE_NOT_FOUND"
                    )
            
            set_items.append(f"{field} = :{field}")
            params[field] = value
        
        if not set_items:
            raise ValidationError(
                "No valid fields to update",
                error_code="NO_UPDATE_FIELDS"
            )
        
        result = self._execute_query(
            f"UPDATE programs SET {', '.join(set_items)} WHERE program_code = :orig_program_code",
            params
        )
        
        if not result or result.rowcount == 0:
            raise NotFoundError(
                f"Program with code '{self.program_code}' not found",
                error_code="PROGRAM_NOT_FOUND"
            )
        
        # Update instance with new values
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(self, field, value)
        
        return self
    
    def delete(self) -> bool:
        """Delete program from database."""
        if not self.program_code:
            raise ValidationError(
                "Cannot delete program without code",
                error_code="NO_PROGRAM_CODE"
            )
        
        result = self._execute_query(
            "DELETE FROM programs WHERE program_code = :program_code",
            {"program_code": self.program_code}
        )
        
        return bool(result and result.rowcount > 0)
    
    def _code_exists(self, program_code: str) -> bool:
        """Check if program code already exists."""
        result = self._execute_query(
            "SELECT 1 FROM programs WHERE program_code = :program_code",
            {"program_code": program_code}
        )
        return result.scalar() is not None
    
    def _college_exists(self, college_code: str) -> bool:
        """Check if college exists."""
        result = self._execute_query(
            "SELECT 1 FROM colleges WHERE college_code = :college_code",
            {"college_code": college_code}
        )
        return result.scalar() is not None
    
    def _count_students(self) -> int:
        """Count students enrolled in this program."""
        result = self._execute_query(
            "SELECT COUNT(*) FROM students WHERE program_code = :program_code",
            {"program_code": self.program_code}
        )
        return result.scalar() or 0
    
    @classmethod
    def find_by_code(cls, program_code: str) -> Optional['Program']:
        """Find program by code."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT program_code, program_name, college_code
            FROM programs
            WHERE program_code = :program_code
            """,
            {"program_code": program_code}
        )
        
        row = result.mappings().first() if result else None
        return cls.from_dict(dict(row)) if row else None
    
    @classmethod
    def find_by_college(cls, college_code: str) -> List['Program']:
        """Find all programs for a specific college."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT program_code, program_name, college_code
            FROM programs
            WHERE college_code = :college_code
            ORDER BY program_code
            """,
            {"college_code": college_code}
        )
        
        return [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
    
    @classmethod
    def search(cls, search_by: str = "", search_term: str = "", sort_by: str = "program_code", 
               sort_order: str = "ASC", page: int = 1, page_size: Optional[int] = 10) -> Tuple[List['Program'], int]:
        """Search programs with pagination."""
        # Validate sort field
        allowed_sort_fields = ["program_code", "program_name", "college_code"]
        if sort_by not in allowed_sort_fields:
            sort_by = "program_code"
        
        # Validate search field
        allowed_search_fields = ["program_code", "program_name", "college_code"]
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
            SELECT program_code, program_name, college_code
            FROM programs
            {filters}
            {sort_clause}
            {pagination_clause}
        """
        
        result = instance._execute_query(query, params)
        programs = [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM programs {filters}"
        count_result = instance._execute_query(count_query, params)
        total_count = count_result.scalar() or 0
        
        return programs, total_count
    
    @classmethod
    def get_all(cls) -> List['Program']:
        """Get all programs."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT program_code, program_name, college_code
            FROM programs
            ORDER BY program_code
            """
        )
        
        return [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
