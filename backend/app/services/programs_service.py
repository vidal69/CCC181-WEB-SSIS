from typing import Dict, Any, List, Tuple
from ..models import Program
from ..models.base_model import ModelError, ValidationError, DatabaseError, NotFoundError


def search_programs(
    sort_by: str,
    sort_order: str,
    search_term: str,
    search_by: str,
    page: int,
    page_size: int,
) -> Dict[str, Any]:
    """Search programs."""
    try:
        programs, total_count = Program.search(
            search_by=search_by,
            search_term=search_term,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size
        )
        
        return {
            "success": True,
            "message": f"Found {len(programs)} programs",
            "data": [program.to_dict() for program in programs],
            "total_count": total_count,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to search programs: {str(e)}",
            "error_code": "SEARCH_ERROR"
        }


def get_program(program_code: str) -> Dict[str, Any]:
    """Get a specific program by code."""
    try:
        program = Program.find_by_code(program_code)
        if program:
            return {
                "success": True,
                "message": "Program found",
                "data": program.to_dict()
            }
        else:
            return {
                "success": False,
                "message": f"Program with code '{program_code}' not found",
                "error_code": "PROGRAM_NOT_FOUND"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve program: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_programs_by_college(college_code: str) -> Dict[str, Any]:
    """Get all programs for a specific college."""
    try:
        programs = Program.find_by_college(college_code)
        return {
            "success": True,
            "message": f"Found {len(programs)} programs for college '{college_code}'",
            "data": [program.to_dict() for program in programs]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve programs: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_all_programs() -> Dict[str, Any]:
    """Get all programs."""
    try:
        programs = Program.get_all()
        return {
            "success": True,
            "message": f"Retrieved {len(programs)} programs",
            "data": [program.to_dict() for program in programs]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve programs: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def create_program(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new program with improved error handling."""
    try:
        program = Program(
            program_code=data.get("program_code", ""),
            program_name=data.get("program_name", ""),
            college_code=data.get("college_code", "")
        )
        saved_program = program.save()
        
        return {
            "success": True,
            "message": "Program created successfully",
            "data": saved_program.to_dict()
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
            "message": "Failed to create program due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def update_program(program_code: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a program with improved error handling."""
    try:
        program = Program.find_by_code(program_code)
        if not program:
            return {
                "success": False,
                "message": f"Program with code '{program_code}' not found",
                "error_code": "PROGRAM_NOT_FOUND"
            }
        
        updated_program = program.update(updates)
        return {
            "success": True,
            "message": "Program updated successfully",
            "data": updated_program.to_dict()
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
            "message": "Failed to update program due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def delete_program(program_code: str) -> Dict[str, Any]:
    """Delete a program with improved error handling."""
    try:
        program = Program.find_by_code(program_code)
        if not program:
            return {
                "success": False,
                "message": f"Program with code '{program_code}' not found",
                "error_code": "PROGRAM_NOT_FOUND"
            }
        
        deleted = program.delete()
        if deleted:
            return {
                "success": True,
                "message": "Program deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to delete program",
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
            "message": "Failed to delete program due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }
