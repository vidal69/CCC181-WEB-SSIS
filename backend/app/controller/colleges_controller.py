from typing import Dict, Any, List, Tuple

from ..models import College
from ..models.base_model import ValidationError, DatabaseError


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


def search_colleges(sort_by: str, sort_order: str, search_term: str, search_by: str, page: int, page_size: int) -> Dict[str, Any]:
    try:
        colleges, total_count = College.search(
            search_by=search_by,
            search_term=search_term,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )

        return _ok(f"Found {len(colleges)} colleges", data=[c.to_dict() for c in colleges], total_count=total_count, page=page, page_size=page_size)
    except Exception as exc:
        return _err(f"Failed to search colleges: {str(exc)}", "SEARCH_ERROR")


def get_college(college_code: str) -> Dict[str, Any]:
    try:
        college = College.find_by_code(college_code)
        if not college:
            return _err(f"College with code '{college_code}' not found", "COLLEGE_NOT_FOUND")
        return _ok("College found", data=college.to_dict())
    except Exception as exc:
        return _err(f"Failed to retrieve college: {str(exc)}", "RETRIEVAL_ERROR")


def get_all_colleges() -> Dict[str, Any]:
    try:
        colleges = College.get_all()
        return _ok(f"Retrieved {len(colleges)} colleges", data=[c.to_dict() for c in colleges])
    except Exception as exc:
        return _err(f"Failed to retrieve colleges: {str(exc)}", "RETRIEVAL_ERROR")


def create_college(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        college = College(college_code=data.get("college_code", ""), college_name=data.get("college_name", ""))
        saved_college = college.save()
        return _ok("College created successfully", data=saved_college.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to create college due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def update_college(college_code: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    try:
        college = College.find_by_code(college_code)
        if not college:
            return _err(f"College with code '{college_code}' not found", "COLLEGE_NOT_FOUND")

        updated = college.update(updates)
        return _ok("College updated successfully", data=updated.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to update college due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def delete_college(college_code: str) -> Dict[str, Any]:
    try:
        college = College.find_by_code(college_code)
        if not college:
            return _err(f"College with code '{college_code}' not found", "COLLEGE_NOT_FOUND")

        deleted = college.delete()
        if deleted:
            return _ok("College deleted successfully")
        return _err("Failed to delete college", "DELETE_FAILED")
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to delete college due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")
