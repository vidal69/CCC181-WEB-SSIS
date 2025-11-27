from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
)
from ..utils.format_response import format_response
from ..controller.auth_controller import create_user, authenticate_user, get_user_by_id

bp = Blueprint("auth", __name__)


def _resp_success(message, data=None, status=200):
    payload = {"status": "success", "message": message}
    if data is not None:
        payload["data"] = data
    return format_response(payload, status)


def _resp_error(message, error_code=None, status=400, details=None):
    payload = {"status": "error", "message": message}
    if error_code:
        payload["error_code"] = error_code
    if details:
        payload["details"] = details
    return format_response(payload, status)


@bp.post("/signup")
def signup():
    try:
        data = request.get_json(force=True)
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        role = "user"  # Default role for new signups

        if not username or not email or not password:
            return _resp_error(
                "Missing required fields: username, email, and password are required",
                error_code="MISSING_REQUIRED_FIELDS",
                status=400,
            )

        result = create_user(username, email, password, role)
        
        if result["success"]:
            access_token = create_access_token(identity=str(result["user"]["user_id"]))
            resp = _resp_success(result["message"], data=result["user"], status=201)
            set_access_cookies(resp, access_token)
            return resp
        else:
            # Return appropriate error response based on error code
            status_code = 400
            if result["error_code"] in ["USERNAME_EXISTS", "EMAIL_EXISTS"]:
                status_code = 409  # Conflict
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            return _resp_error(
                result["message"],
                error_code=result.get("error_code"),
                status=status_code,
                details=result.get("details", {}),
            )

    except Exception as e:
        return _resp_error(
            f"Unexpected error occurred: {str(e)}",
            error_code="UNEXPECTED_ERROR",
            status=500,
        )


@bp.post("/login")
def login():
    try:
        data = request.get_json(force=True)
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return _resp_error(
                "Missing required fields: email and password are required",
                error_code="MISSING_REQUIRED_FIELDS",
                status=400,
            )

        result = authenticate_user(email, password)
        
        if result["success"]:
            access_token = create_access_token(identity=str(result["user"]["user_id"]))
            resp = _resp_success(result["message"], data=result["user"], status=200)
            set_access_cookies(resp, access_token)
            return resp
        else:
            status_code = 401 if result["error_code"] == "INVALID_CREDENTIALS" else 500
            return _resp_error(
                result["message"],
                error_code=result.get("error_code"),
                status=status_code,
            )

    except Exception as e:
        return _resp_error(
            f"Unexpected error occurred: {str(e)}",
            error_code="UNEXPECTED_ERROR",
            status=500,
        )


@bp.post("/logout")
def logout():
    try:
        resp = _resp_success("Successfully logged out", status=200)
        unset_jwt_cookies(resp)
        return resp
    except Exception as e:
        return _resp_error(
            f"Unexpected error occurred: {str(e)}",
            error_code="UNEXPECTED_ERROR",
            status=500,
        )


@bp.get("/me")
@jwt_required()
def me():
    try:
        identity = get_jwt_identity()

        result = get_user_by_id(identity)
        if not result["success"]:
            return _resp_error(
                result["message"],
                error_code=result.get("error_code", "USER_NOT_FOUND"),
                status=404,
            )

        return _resp_success(
            "User information retrieved successfully",
            data=result["user"],
            status=200,
        )
    except Exception as e:
        return _resp_error(
            f"Unexpected error occurred: {str(e)}",
            error_code="UNEXPECTED_ERROR",
            status=500,
        )