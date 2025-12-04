from typing import Dict, Any, List, Tuple, Optional
from ..models import Student
from ..models.base_model import ModelError, ValidationError, DatabaseError, NotFoundError
from ..utils.validation_utils import _valid_id_number


def search_students(
    sort_by: str,
    sort_order: str,
    search_term: str,
    search_by: str,
    page: int,
    page_size: int,
) -> Dict[str, Any]:
    """Search students with improved error handling."""
    try:
        students, total_count = Student.search(
            search_by=search_by,
            search_term=search_term,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size
        )
        
        return {
            "success": True,
            "message": f"Found {len(students)} students",
            "data": [student.to_dict() for student in students],
            "total_count": total_count,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to search students: {str(e)}",
            "error_code": "SEARCH_ERROR"
        }


def get_student(id_number: str) -> Dict[str, Any]:
    """Get a specific student by ID number."""
    try:
        if not _valid_id_number(id_number):
            return {
                "success": False,
                "message": "Invalid ID number format",
                "error_code": "INVALID_ID_NUMBER"
            }
        
        student = Student.find_by_id(id_number)
        if student:
            return {
                "success": True,
                "message": "Student found",
                "data": student.to_dict()
            }
        else:
            return {
                "success": False,
                "message": f"Student with ID '{id_number}' not found",
                "error_code": "STUDENT_NOT_FOUND"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve student: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_students_by_program(program_code: str) -> Dict[str, Any]:
    """Get all students in a specific program."""
    try:
        students = Student.find_by_program(program_code)
        return {
            "success": True,
            "message": f"Found {len(students)} students in program '{program_code}'",
            "data": [student.to_dict() for student in students]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve students: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_all_students() -> Dict[str, Any]:
    """Get all students."""
    try:
        students = Student.get_all()
        return {
            "success": True,
            "message": f"Retrieved {len(students)} students",
            "data": [student.to_dict() for student in students]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve students: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def create_student(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new student with improved error handling."""
    try:
        student = Student(
            id_number=data.get("id_number", ""),
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
            year_level=data.get("year_level"),
            gender=data.get("gender", ""),
            program_code=data.get("program_code", ""),
            photo_path=data.get("photo_path", "")
        )
        saved_student = student.save()
        
        return {
            "success": True,
            "message": "Student created successfully",
            "data": saved_student.to_dict()
        }
    except ValidationError as e:
        return {
            "success": False,
            "message": e.message,
            "error_code": e.error_code,
            "details": e.details
        }
    except DatabaseError as e:
        return {
            "success": False,
            "message": "Failed to create student due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def update_student(id_number: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a student."""
    try:
        student = Student.find_by_id(id_number)
        if not student:
            return {
                "success": False,
                "message": f"Student with ID '{id_number}' not found",
                "error_code": "STUDENT_NOT_FOUND"
            }
        
        updated_student = student.update(updates)
        return {
            "success": True,
            "message": "Student updated successfully",
            "data": updated_student.to_dict()
        }
    except ValidationError as e:
        return {
            "success": False,
            "message": e.message,
            "error_code": e.error_code,
            "details": e.details
        }
    except DatabaseError as e:
        return {
            "success": False,
            "message": "Failed to update student due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def delete_student(id_number: str) -> Dict[str, Any]:
    """Delete a student with improved error handling."""
    try:
        student = Student.find_by_id(id_number)
        if not student:
            return {
                "success": False,
                "message": f"Student with ID '{id_number}' not found",
                "error_code": "STUDENT_NOT_FOUND"
            }
        
        deleted = student.delete()
        if deleted:
            return {
                "success": True,
                "message": "Student deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to delete student",
                "error_code": "DELETE_FAILED"
            }
    except ValidationError as e:
        return {
            "success": False,
            "message": e.message,
            "error_code": e.error_code,
            "details": e.details
        }
    except DatabaseError as e:
        return {
            "success": False,
            "message": "Failed to delete student due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }
