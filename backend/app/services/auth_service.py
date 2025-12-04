from typing import Optional, Dict, Any
from ..models import User
from ..models.base_model import ModelError, ValidationError, DatabaseError, NotFoundError


def create_user(username: str, email: str, password: str, role: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user with improved error handling."""
    try:
        user = User(username=username, email=email, role=role or "admin")
        user.set_password(password)
        saved_user = user.save()
        
        return {
            "success": True,
            "message": "User created successfully",
            "user": saved_user.to_dict()
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
            "message": "Failed to create user due to database error",
            "error_code": e.error_code,
            "details": e.details
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """Authenticate user with improved error handling."""
    try:
        user = User.authenticate(email, password)
        if user:
            return {
                "success": True,
                "message": "Authentication successful",
                "user": user.to_dict()
            }
        else:
            return {
                "success": False,
                "message": "Invalid email or password",
                "error_code": "INVALID_CREDENTIALS"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Authentication failed: {str(e)}",
            "error_code": "AUTHENTICATION_ERROR"
        }


def get_user_by_email(email: str) -> Dict[str, Any]:
    """Get user by email with improved error handling."""
    try:
        user = User.find_by_email(email)
        if user:
            return {
                "success": True,
                "message": "User found",
                "user": user.to_dict()
            }
        else:
            return {
                "success": False,
                "message": "User not found",
                "error_code": "USER_NOT_FOUND"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve user: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }


def get_user_by_id(user_id: int) -> Dict[str, Any]:
    """Get user by ID with improved error handling."""
    try:
        user = User.find_by_id(user_id)
        if user:
            return {
                "success": True,
                "message": "User found",
                "user": user.to_dict()
            }
        else:
            return {
                "success": False,
                "message": "User not found",
                "error_code": "USER_NOT_FOUND"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to retrieve user: {str(e)}",
            "error_code": "RETRIEVAL_ERROR"
        }