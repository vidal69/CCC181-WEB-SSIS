from flask import Blueprint, request
from flask_jwt_extended import (
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
    jwt_required,
    get_jwt_identity,
)
from ..utils.route_utils import make_response
from ..services.auth_service import create_user, authenticate_user, get_user_by_id

bp = Blueprint("auth", __name__)


@bp.post("/signup")
def signup():
    try:
        data = request.get_json(force=True)
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        role = "user"  # Default role for new signups

        if not username or not email or not password:
            return make_response({
                "status": "error", 
                "message": "Missing required fields: username, email, and password are required",
                "error_code": "MISSING_REQUIRED_FIELDS"
            }, 400)

        result = create_user(username, email, password, role)
        
        if result["success"]:
            access_token = create_access_token(identity=str(result["user"]["user_id"]))

            resp = make_response({
                "status": "success",
                "message": result["message"],
                "data": result["user"]
            }, 201)

            set_access_cookies(resp, access_token)
            return resp
        else:
            # Return appropriate error response based on error code
            status_code = 400
            if result["error_code"] in ["USERNAME_EXISTS", "EMAIL_EXISTS"]:
                status_code = 409  # Conflict
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            
            return make_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"],
                "details": result.get("details", {})
            }, status_code)

    except Exception as e:
        return make_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/login")
def login():
    try:
        data = request.get_json(force=True)
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return make_response({
                "status": "error", 
                "message": "Missing required fields: email and password are required",
                "error_code": "MISSING_REQUIRED_FIELDS"
            }, 400)

        result = authenticate_user(email, password)
        
        if result["success"]:
            access_token = create_access_token(identity=str(result["user"]["user_id"]))

            resp = make_response({
                "status": "success",
                "message": result["message"],
                "data": result["user"]
            }, 200)
            set_access_cookies(resp, access_token)
            return resp
        else:
            status_code = 401 if result["error_code"] == "INVALID_CREDENTIALS" else 500
            return make_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"]
            }, status_code)

    except Exception as e:
        return make_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/logout")
def logout():
    try:
        resp = make_response({
            "status": "success", 
            "message": "Successfully logged out"
        }, 200)
        unset_jwt_cookies(resp)
        return resp
    except Exception as e:
        return make_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.get("/me")
@jwt_required()
def me():
    try:
        identity = get_jwt_identity()

        result = get_user_by_id(identity)
        if not result["success"]:
            return make_response({
                "status": "error",
                "message": result["message"],
                "error_code": result.get("error_code", "USER_NOT_FOUND")
            }, 404)
        
        return make_response({
            "status": "success",
            "message": "User information retrieved successfully",
            "data": result["user"]
        }, 200)

    except Exception as e:
        return make_response({
            "status": "error",
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)