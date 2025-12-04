from typing import Dict, Any, List, Tuple
from ..models import College
from ..models.base_model import ModelError, ValidationError, DatabaseError, NotFoundError


def search_colleges(
    sort_by: str,
    sort_order: str,
    search_term: str,
    search_by: str,
    page: int,
    page_size: int,
) -> Dict[str, Any]:
    """Search colleges."""
    try:
        colleges, total_count = College.search(
            search_by=search_by,
            search_term=search_term,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size
        )
        
        return {
            "success": True,
            "message": f"Found {len(colleges)} colleges",
            "data": [college.to_dict() for college in colleges],
            "total_count": total_count,
            "page": page,
            "page_size": page_size
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to search colleges: {str(e)}",
            "error_code": "SEARCH_ERROR"
        }


def get_college(college_code: str) -> Dict[str, Any]:
    """Get a specific college by code."""
    try:
        college = College.find_by_code(college_code)
        if college:
            return {
                "success": True,
                "message": "College found",
                "data": college.to_dict()
            }
        else:
            return {
                "success": False,
                "message": f"College with code '{college_code}' not found",
                "error_code": "COLLEGE_NOT_FOUND"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve college: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_all_colleges() -> Dict[str, Any]:
    """Get all colleges."""
    try:
        colleges = College.get_all()
        return {
            "success": True,
            "message": f"Retrieved {len(colleges)} colleges",
            "data": [college.to_dict() for college in colleges]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve colleges: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def create_college(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new college with improved error handling."""
    try:
        college = College(
            college_code=data.get("college_code", ""),
            college_name=data.get("college_name", "")
        )
        saved_college = college.save()
        
        return {
            "success": True,
            "message": "College created successfully",
            "data": saved_college.to_dict()
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
            "message": "Failed to create college due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def update_college(college_code: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update a college with improved error handling."""
    try:
        college = College.find_by_code(college_code)
        if not college:
            return {
                "success": False,
                "message": f"College with code '{college_code}' not found",
                "error_code": "COLLEGE_NOT_FOUND"
            }
        
        updated_college = college.update(updates)
        return {
            "success": True,
            "message": "College updated successfully",
            "data": updated_college.to_dict()
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
            "message": "Failed to update college due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def delete_college(college_code: str) -> Dict[str, Any]:
    """Delete a college with improved error handling."""
    try:
        college = College.find_by_code(college_code)
        if not college:
            return {
                "success": False,
                "message": f"College with code '{college_code}' not found",
                "error_code": "COLLEGE_NOT_FOUND"
            }
        
        deleted = college.delete()
        if deleted:
            return {
                "success": True,
                "message": "College deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to delete college",
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
            "message": "Failed to delete college due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }
