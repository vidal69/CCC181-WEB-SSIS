"""
Student model for student management.
"""
from typing import Dict, Any, List, Optional, Tuple
from .base_model import BaseModel, ValidationError, DatabaseError, NotFoundError
from ..utils.validation_utils import _valid_id_number


class Student(BaseModel):
    """Student model for student management."""
    
    ALLOWED_GENDERS = {"MALE", "FEMALE", "OTHER"}
    
    def __init__(self, id_number: str = "", first_name: str = "", last_name: str = "", 
                 year_level: Optional[int] = None, gender: str = "", program_code: str = "",
                 photo_path: str = ""):
        self.id_number = id_number
        self.first_name = first_name
        self.last_name = last_name
        self.year_level = year_level
        self.gender = gender
        self.program_code = program_code
        self.photo_path = photo_path
    
    @property
    def table_name(self) -> str:
        return "students"
    
    @property
    def primary_key(self) -> str:
        return "id_number"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert student instance to dictionary."""
        return {
            "id_number": self.id_number,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "year_level": self.year_level,
            "gender": self.gender,
            "program_code": self.program_code,
            "photo_path": self.photo_path
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Student':
        """Create student instance from dictionary."""
        return cls(
            id_number=data.get("id_number", ""),
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            year_level=data.get("year_level"),
            gender=data.get("gender", ""),
            program_code=data.get("program_code", ""),
            photo_path=data.get("photo_path", "")
        )
    
    def validate(self) -> None:
        """Validate student data."""
        required_fields = ["id_number", "first_name", "last_name", "year_level", "gender", "program_code"]
        self._validate_required_fields(self.to_dict(), required_fields)
        
        # Validate ID number
        if not _valid_id_number(self.id_number):
            raise ValidationError(
                "Invalid ID number format",
                error_code="INVALID_ID_NUMBER"
            )
        
        # Validate first name
        if not self.first_name.strip():
            raise ValidationError(
                "First name cannot be empty",
                error_code="EMPTY_FIRST_NAME"
            )
        
        if len(self.first_name) > 50:
            raise ValidationError(
                "First name cannot exceed 50 characters",
                error_code="FIRST_NAME_TOO_LONG"
            )
        
        # Validate last name
        if not self.last_name.strip():
            raise ValidationError(
                "Last name cannot be empty",
                error_code="EMPTY_LAST_NAME"
            )
        
        if len(self.last_name) > 50:
            raise ValidationError(
                "Last name cannot exceed 50 characters",
                error_code="LAST_NAME_TOO_LONG"
            )
        
        # Validate year level
        if not isinstance(self.year_level, int) or self.year_level < 1 or self.year_level > 5:
            raise ValidationError(
                "Year level must be an integer between 1 and 5",
                error_code="INVALID_YEAR_LEVEL"
            )
        
        # Validate gender
        if self.gender not in self.ALLOWED_GENDERS:
            raise ValidationError(
                f"Invalid gender: {self.gender}. Must be one of {', '.join(self.ALLOWED_GENDERS)}",
                error_code="INVALID_GENDER"
            )
        
        # Validate program exists
        if not self._program_exists(self.program_code):
            raise ValidationError(
                f"Program with code '{self.program_code}' does not exist",
                error_code="PROGRAM_NOT_FOUND"
            )
    
    def save(self) -> 'Student':
        """Save student to database."""
        self.validate()
        
        # Check for duplicate ID number
        if self._id_exists(self.id_number):
            raise ValidationError(
                f"Student with ID number '{self.id_number}' already exists",
                error_code="STUDENT_ID_EXISTS"
            )
        
        result = self._execute_query(
            """
            INSERT INTO students (id_number, first_name, last_name, year_level, gender, program_code, photo_path)
            VALUES (:id_number, :first_name, :last_name, :year_level, :gender, :program_code, :photo_path)
            """,
            {
                "id_number": self.id_number,
                "first_name": self.first_name,
                "last_name": self.last_name,
                "year_level": self.year_level,
                "gender": self.gender,
                "program_code": self.program_code,
                "photo_path": self.photo_path
            }
        )
        
        if not result:
            raise DatabaseError(
                "Failed to create student",
                error_code="STUDENT_CREATION_FAILED"
            )
        
        return self
    
    def update(self, updates: Dict[str, Any]) -> 'Student':
        """Update student with new data."""
        allowed_fields = {"id_number", "first_name", "last_name", "year_level", "gender", "program_code", "photo_path"}
        set_items = []
        params = {"orig_id_number": self.id_number}
        
        # Validate updates
        for field, value in updates.items():
            if field not in allowed_fields:
                continue
            
            if field == "id_number" and value != self.id_number:
                # Validate new ID number format
                if not _valid_id_number(value):
                    raise ValidationError(
                        "Invalid ID number format",
                        error_code="INVALID_ID_NUMBER"
                    )
                # Check if new ID already exists
                if self._id_exists(value):
                    raise ValidationError(
                        f"Student with ID number '{value}' already exists",
                        error_code="STUDENT_ID_EXISTS"
                    )
            
            if field == "year_level":
                if not isinstance(value, int) or value < 1 or value > 5:
                    raise ValidationError(
                        "Year level must be an integer between 1 and 5",
                        error_code="INVALID_YEAR_LEVEL"
                    )
            
            if field == "gender":
                if value not in self.ALLOWED_GENDERS:
                    raise ValidationError(
                        f"Invalid gender: {value}. Must be one of {', '.join(self.ALLOWED_GENDERS)}",
                        error_code="INVALID_GENDER"
                    )
            
            if field == "program_code" and value != self.program_code:
                # Validate new program exists
                if not self._program_exists(value):
                    raise ValidationError(
                        f"Program with code '{value}' does not exist",
                        error_code="PROGRAM_NOT_FOUND"
                    )
            
            set_items.append(f"{field} = :{field}")
            params[field] = value
        
        if not set_items:
            raise ValidationError(
                "No valid fields to update",
                error_code="NO_UPDATE_FIELDS"
            )
        
        result = self._execute_query(
            f"UPDATE students SET {', '.join(set_items)} WHERE id_number = :orig_id_number",
            params
        )
        
        if not result or result.rowcount == 0:
            raise NotFoundError(
                f"Student with ID '{self.id_number}' not found",
                error_code="STUDENT_NOT_FOUND"
            )
        
        # Update instance with new values
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(self, field, value)
        
        return self
    
    def delete(self) -> bool:
        """Delete student from database."""
        if not self.id_number:
            raise ValidationError(
                "Cannot delete student without ID number",
                error_code="NO_ID_NUMBER"
            )
        
        result = self._execute_query(
            "DELETE FROM students WHERE id_number = :id_number",
            {"id_number": self.id_number}
        )
        
        return bool(result and result.rowcount > 0)
    
    def _id_exists(self, id_number: str) -> bool:
        """Check if student ID already exists."""
        result = self._execute_query(
            "SELECT 1 FROM students WHERE id_number = :id_number",
            {"id_number": id_number}
        )
        return result.scalar() is not None
    
    def _program_exists(self, program_code: str) -> bool:
        """Check if program exists."""
        result = self._execute_query(
            "SELECT 1 FROM programs WHERE program_code = :program_code",
            {"program_code": program_code}
        )
        return result.scalar() is not None
    
    @classmethod
    def find_by_id(cls, id_number: str) -> Optional['Student']:
        """Find student by ID number."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT id_number, first_name, last_name, year_level, gender, program_code, photo_path
            FROM students
            WHERE id_number = :id_number
            """,
            {"id_number": id_number}
        )
        
        row = result.mappings().first() if result else None
        return cls.from_dict(dict(row)) if row else None
    
    @classmethod
    def find_by_program(cls, program_code: str) -> List['Student']:
        """Find all students in a specific program."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT id_number, first_name, last_name, year_level, gender, program_code, photo_path
            FROM students
            WHERE program_code = :program_code
            ORDER BY last_name, first_name
            """,
            {"program_code": program_code}
        )
        
        return [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
    
    @classmethod
    def search(cls, search_by: str = "", search_term: str = "", sort_by: str = "id_number", 
               sort_order: str = "ASC", page: int = 1, page_size: int = 10) -> Tuple[List['Student'], int]:
        """Search students with pagination."""
        # Validate sort field
        allowed_sort_fields = ["id_number", "first_name", "last_name", "year_level", "gender", "program_code"]
        if sort_by not in allowed_sort_fields:
            sort_by = "id_number"
        
        # Validate search field
        allowed_search_fields = ["id_number", "first_name", "last_name", "year_level", "gender", "program_code"]
        if search_by and search_by not in allowed_search_fields:
            search_by = ""
        
        # Build search filter
        instance = cls()
        filters, params = instance._build_search_filter(search_by, search_term, allowed_search_fields)
        
        # Build sort clause
        sort_clause = instance._build_sort_clause(sort_by, sort_order, allowed_sort_fields)
        
        # Build pagination
        offset = (page - 1) * page_size
        pagination_clause = instance._build_pagination_clause(page_size, offset)
        
        # Execute search query
        query = f"""
            SELECT id_number, first_name, last_name, year_level, gender, program_code, photo_path
            FROM students
            {filters}
            {sort_clause}
            {pagination_clause}
        """
        
        result = instance._execute_query(query, params)
        students = [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM students {filters}"
        count_result = instance._execute_query(count_query, params)
        total_count = count_result.scalar() or 0
        
        return students, total_count
    
    @classmethod
    def get_all(cls) -> List['Student']:
        """Get all students."""
        instance = cls()
        result = instance._execute_query(
            """
            SELECT id_number, first_name, last_name, year_level, gender, program_code, photo_path
            FROM students
            ORDER BY last_name, first_name
            """
        )
        
        return [cls.from_dict(dict(row)) for row in result.mappings().all()] if result else []
