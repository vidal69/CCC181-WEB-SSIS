from typing import Optional, Dict, Any

from ..models import User
from ..models.base_model import ValidationError, DatabaseError


def _error(message: str, error_code: str = "UNEXPECTED_ERROR", details: Dict[str, Any] | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": False, "message": message, "error_code": error_code}
    if details:
        payload["details"] = details
    return payload


def create_user(username: str, email: str, password: str, role: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user.

    Preserves existing behavior but centralizes error formatting.
    """
    try:
        user = User(username=username, email=email, role=role or "admin")
        user.set_password(password)
        saved_user = user.save()

        return {
            "success": True,
            "message": "User created successfully",
            "user": saved_user.to_dict(),
        }
    except ValidationError as exc:
        return _error(exc.message, getattr(exc, "error_code", "VALIDATION_ERROR"), getattr(exc, "details", None))
    except DatabaseError as exc:
        return _error("Failed to create user due to database error", getattr(exc, "error_code", "DATABASE_ERROR"), getattr(exc, "details", None))
    except Exception as exc:  # pragma: no cover - unexpected fallback
        return _error(f"Unexpected error occurred: {str(exc)}")


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """Authenticate a user by email/password.

    Returns the same success/error contract as before.
    """
    try:
        user = User.authenticate(email, password)
        if user:
            return {"success": True, "message": "Authentication successful", "user": user.to_dict()}
        return _error("Invalid email or password", "INVALID_CREDENTIALS")
    except Exception as exc:
        return _error(f"Authentication failed: {str(exc)}", "AUTHENTICATION_ERROR")


def get_user_by_email(email: str) -> Dict[str, Any]:
    """Retrieve a user by email."""
    try:
        user = User.find_by_email(email)
        if user:
            return {"success": True, "message": "User found", "user": user.to_dict()}
        return _error("User not found", "USER_NOT_FOUND")
    except Exception as exc:
        return _error(f"Failed to retrieve user: {str(exc)}", "RETRIEVAL_ERROR")


def get_user_by_id(user_id: int) -> Dict[str, Any]:
    """Retrieve a user by their ID."""
    try:
        user = User.find_by_id(user_id)
        if user:
            return {"success": True, "message": "User found", "user": user.to_dict()}
        return _error("User not found", "USER_NOT_FOUND")
    except Exception as exc:
        return _error(f"Failed to retrieve user: {str(exc)}", "RETRIEVAL_ERROR")