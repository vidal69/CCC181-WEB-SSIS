from typing import Dict, Any, List, Tuple

from ..models import Program
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


def search_programs(sort_by: str, sort_order: str, search_term: str, search_by: str, page: int, page_size: int) -> Dict[str, Any]:
    try:
        programs, total_count = Program.search(
            search_by=search_by,
            search_term=search_term,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )
        return _ok(f"Found {len(programs)} programs", data=[p.to_dict() for p in programs], total_count=total_count, page=page, page_size=page_size)
    except Exception as exc:
        return _err(f"Failed to search programs: {str(exc)}", "SEARCH_ERROR")


def get_program(program_code: str) -> Dict[str, Any]:
    try:
        program = Program.find_by_code(program_code)
        if not program:
            return _err(f"Program with code '{program_code}' not found", "PROGRAM_NOT_FOUND")
        return _ok("Program found", data=program.to_dict())
    except Exception as exc:
        return _err(f"Failed to retrieve program: {str(exc)}", "RETRIEVAL_ERROR")


def get_programs_by_college(college_code: str) -> Dict[str, Any]:
    try:
        programs = Program.find_by_college(college_code)
        return _ok(f"Found {len(programs)} programs for college '{college_code}'", data=[p.to_dict() for p in programs])
    except Exception as exc:
        return _err(f"Failed to retrieve programs: {str(exc)}", "RETRIEVAL_ERROR")


def get_all_programs() -> Dict[str, Any]:
    try:
        programs = Program.get_all()
        return _ok(f"Retrieved {len(programs)} programs", data=[p.to_dict() for p in programs])
    except Exception as exc:
        return _err(f"Failed to retrieve programs: {str(exc)}", "RETRIEVAL_ERROR")


def create_program(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        program = Program(program_code=data.get("program_code", ""), program_name=data.get("program_name", ""), college_code=data.get("college_code", ""))
        saved_program = program.save()
        return _ok("Program created successfully", data=saved_program.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to create program due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def update_program(program_code: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    try:
        program = Program.find_by_code(program_code)
        if not program:
            return _err(f"Program with code '{program_code}' not found", "PROGRAM_NOT_FOUND")
        updated = program.update(updates)
        return _ok("Program updated successfully", data=updated.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to update program due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def delete_program(program_code: str) -> Dict[str, Any]:
    try:
        program = Program.find_by_code(program_code)
        if not program:
            return _err(f"Program with code '{program_code}' not found", "PROGRAM_NOT_FOUND")
        deleted = program.delete()
        if deleted:
            return _ok("Program deleted successfully")
        return _err("Failed to delete program", "DELETE_FAILED")
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to delete program due to database error", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")
