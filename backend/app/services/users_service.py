from typing import Dict, Any
from ..models import User
from ..models.base_model import ValidationError, DatabaseError, NotFoundError


def get_all_users() -> Dict[str, Any]:
    try:
        users = User.get_all()
        return {
            "success": True,
            "message": f"Retrieved {len(users)} users",
            "data": [u.to_dict() for u in users]
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve users: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_user_by_id(user_id: int) -> Dict[str, Any]:
    try:
        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "message": f"User with ID '{user_id}' not found",
                "error_code": "USER_NOT_FOUND"
            }
        return {
            "success": True,
            "message": "User retrieved successfully",
            "data": user.to_dict()
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to get user: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def create_user(data: Dict[str, Any]) -> Dict[str, Any]:
    try:
        user = User(
            username=data.get("username", ""),
            email=data.get("email", ""),
            role=data.get("role", "user")
        )
        user.set_password(data.get("password", ""))
        saved = user.save()
        return {
            "success": True,
            "message": "User created successfully",
            "data": saved.to_dict()
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
            "message": "Database error occurred",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def update_user(user_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
    try:
        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "message": f"User with ID '{user_id}' not found",
                "error_code": "USER_NOT_FOUND"
            }

        # Explicitly prevent password updates
        if "password" in updates:
            updates.pop("password", None)

        # Only allow safe editable fields
        editable_fields = {"username", "email", "role"}
        updates = {k: v for k, v in updates.items() if k in editable_fields}

        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)

        updated_user = user.save()
        return {
            "success": True,
            "message": "User updated successfully",
            "data": updated_user.to_dict()
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
            "message": "Failed to update user",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def delete_user(user_id: int) -> Dict[str, Any]:
    try:
        user = User.find_by_id(user_id)
        if not user:
            return {
                "success": False,
                "message": f"User with ID '{user_id}' not found",
                "error_code": "USER_NOT_FOUND"
            }
        deleted = user.delete()
        if not deleted:
            return {
                "success": False,
                "message": "Failed to delete user",
                "error_code": "DELETE_FAILED"
            }
        return {
            "success": True,
            "message": "User deleted successfully"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }
