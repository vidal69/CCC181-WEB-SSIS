from typing import Dict, Any, List, Tuple, Optional
from ..models import Student
from ..models.base_model import ValidationError, DatabaseError
from ..utils.validation import _valid_id_number


def _ok(message: str = "", *, data: Any = None, **meta) -> Dict[str, Any]:
    resp: Dict[str, Any] = {"success": True, "message": message}
    if data is not None:
        resp["data"] = data
    resp.update(meta)
    return resp


def _err(message: str, error_code: str = "UNEXPECTED_ERROR", details: Any = None) -> Dict[str, Any]:
    payload = {"success": False, "message": message, "error_code": error_code}
    if details is not None:
        payload["details"] = details
    return payload


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
            page_size=page_size,
        )

        return _ok(f"Found {len(students)} students", data=[s.to_dict() for s in students], total_count=total_count, page=page, page_size=page_size)
    except Exception as exc:
        return _err(f"Failed to search students: {str(exc)}", "SEARCH_ERROR")


def get_student(id_number: str) -> Dict[str, Any]:
    """Get a specific student by ID number."""
    try:
        if not _valid_id_number(id_number):
            return _err("Invalid ID number format", "INVALID_ID_NUMBER")

        student = Student.find_by_id(id_number)
        if not student:
            return _err(f"Student with ID '{id_number}' not found", "STUDENT_NOT_FOUND")

        return _ok("Student found", data=student.to_dict())
    except Exception as exc:
        return _err(f"Failed to retrieve student: {str(exc)}", "RETRIEVAL_ERROR")


def get_students_by_program(program_code: str) -> Dict[str, Any]:
    """Get all students in a specific program."""
    try:
        students = Student.find_by_program(program_code)
        return _ok(f"Found {len(students)} students in program '{program_code}'", data=[s.to_dict() for s in students])
    except Exception as exc:
        return _err(f"Failed to retrieve students: {str(exc)}", "RETRIEVAL_ERROR")


def get_all_students() -> Dict[str, Any]:
    """Get all students."""
    try:
        students = Student.get_all()
        return _ok(f"Retrieved {len(students)} students", data=[s.to_dict() for s in students])
    except Exception as exc:
        return _err(f"Failed to retrieve students: {str(exc)}", "RETRIEVAL_ERROR")


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
            photo_path=data.get("photo_path", ""),
        )
        saved_student = student.save()
        return _ok("Student created successfully", data=saved_student.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to create student due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def update_student(id_number: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a student."""
    try:
        student = Student.find_by_id(id_number)
        if not student:
            return _err(f"Student with ID '{id_number}' not found", "STUDENT_NOT_FOUND")

        updated_student = student.update(updates)
        return _ok("Student updated successfully", data=updated_student.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to update student due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def delete_student(id_number: str) -> Dict[str, Any]:
    """Delete a student with improved error handling."""
    try:
        student = Student.find_by_id(id_number)
        if not student:
            return _err(f"Student with ID '{id_number}' not found", "STUDENT_NOT_FOUND")

        deleted = student.delete()
        if deleted:
            return _ok("Student deleted successfully")
        return _err("Failed to delete student", "DELETE_FAILED")
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to delete student due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")
