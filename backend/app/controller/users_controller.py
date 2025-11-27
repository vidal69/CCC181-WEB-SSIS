from typing import Dict, Any

from ..models import User
from ..models.base_model import ValidationError, DatabaseError


def _ok(message: str = "", *, data: Any = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return payload


def _err(message: str, error_code: str = "UNEXPECTED_ERROR", details: Any = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": False, "message": message, "error_code": error_code}
    if details is not None:
        payload["details"] = details
    return payload


def get_all_users() -> Dict[str, Any]:
    try:
        users = User.get_all()
        return _ok(f"Retrieved {len(users)} users", data=[u.to_dict() for u in users])
    except Exception as exc:
        return _err(f"Failed to retrieve users: {str(exc)}", "RETRIEVAL_ERROR")


def get_user_by_id(user_id: int) -> Dict[str, Any]:
    try:
        user = User.find_by_id(user_id)
        if not user:
            return _err(f"User with ID '{user_id}' not found", "USER_NOT_FOUND")
        return _ok("User retrieved successfully", data=user.to_dict())
    except Exception as exc:
        return _err(f"Failed to get user: {str(exc)}", "RETRIEVAL_ERROR")


def create_user(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        user = User(username=data.get("username", ""), email=data.get("email", ""), role=data.get("role", "user"))
        user.set_password(data.get("password", ""))
        saved = user.save()
        return _ok("User created successfully", data=saved.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Database error occurred", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error: {str(exc)}")


def update_user(user_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
    try:
        user = User.find_by_id(user_id)
        if not user:
            return _err(f"User with ID '{user_id}' not found", "USER_NOT_FOUND")

        # Prevent password changes via this endpoint
        updates.pop("password", None)

        editable = {"username", "email", "role"}
        updates = {k: v for k, v in updates.items() if k in editable}

        for k, v in updates.items():
            if hasattr(user, k):
                setattr(user, k, v)

        updated_user = user.save()
        return _ok("User updated successfully", data=updated_user.to_dict())
    except ValidationError as exc:
        return _err(exc.message, exc.error_code, exc.details)
    except DatabaseError as exc:
        return _err("Failed to update user", exc.error_code, exc.details)
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")


def delete_user(user_id: int) -> Dict[str, Any]:
    try:
        user = User.find_by_id(user_id)
        if not user:
            return _err(f"User with ID '{user_id}' not found", "USER_NOT_FOUND")
        deleted = user.delete()
        if not deleted:
            return _err("Failed to delete user", "DELETE_FAILED")
        return _ok("User deleted successfully")
    except Exception as exc:
        return _err(f"Unexpected error occurred: {str(exc)}")
