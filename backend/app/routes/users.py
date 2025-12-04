from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from typing import Dict, Any
from ..utils.route_utils import make_response
from ..utils.admin_required import admin_required
from ..models import User
from ..services.users_service import (
    get_all_users,
    get_user_by_id,
    create_user,
    update_user,
    delete_user
)

bp = Blueprint("users", __name__)


@bp.get("/")
@jwt_required()
@admin_required
def list_users_route():
    try:
        users = get_all_users()
        if users["success"]:
            return make_response({
                "status": "success",
                "message": users["message"],
                "data": users["data"]
            }, 200)
        else:
            return make_response({
                "status": "error",
                "message": users["message"],
                "error_code": users["error_code"]
            }, 500)
    except Exception as e:
        return make_response({
            "status": "error",
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.get("/<int:user_id>")
@jwt_required()
@admin_required
def get_user_route(user_id: int):
    try:
        result = get_user_by_id(user_id)
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 200)
        else:
            status_code = 404 if result["error_code"] == "USER_NOT_FOUND" else 400
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


@bp.post("/")
@jwt_required()
@admin_required
def create_user_route():
    data: Dict[str, Any] = request.get_json(force=True) or {}
    try:
        result = create_user(data)
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 201)
        else:
            status_code = 400
            if result["error_code"] in ["USERNAME_EXISTS", "EMAIL_EXISTS"]:
                status_code = 409
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


@bp.put("/<int:user_id>")
@jwt_required()
@admin_required
def update_user_route(user_id: int):
    updates = request.get_json(force=True) or {}
    try:
        result = update_user(user_id, updates)
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 200)
        else:
            status_code = 400 if result["error_code"] != "USER_NOT_FOUND" else 404
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


@bp.delete("/<int:user_id>")
@jwt_required()
@admin_required
def delete_user_route(user_id: int):
    try:
        result = delete_user(user_id)
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"]
            }, 200)
        else:
            status_code = 404 if result["error_code"] == "USER_NOT_FOUND" else 400
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
