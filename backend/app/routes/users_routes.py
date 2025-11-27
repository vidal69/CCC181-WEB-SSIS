from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from typing import Dict, Any
from ..utils.format_response import format_response
from ..utils.admin_required import admin_required
from ..models import User
from ..controller.users_controller import (
    get_all_users,
    get_user_by_id,
    create_user,
    update_user,
    delete_user
)

bp = Blueprint("users", __name__)


def _ok(message, data=None, status=200):
    payload = {"status": "success", "message": message}
    if data is not None:
        payload["data"] = data
    return format_response(payload, status)


def _err(message, error_code=None, status=400, details=None):
    payload = {"status": "error", "message": message}
    if error_code:
        payload["error_code"] = error_code
    if details:
        payload["details"] = details
    return format_response(payload, status)


@bp.get("/")
@jwt_required()
@admin_required
def list_users_route():
    try:
        users = get_all_users()
        if users["success"]:
            return _ok(users["message"], data=users["data"], status=200)
        else:
            return _err(users["message"], error_code=users.get("error_code"), status=500)
    except Exception as e:
        return _err(f"Unexpected error occurred: {str(e)}", error_code="UNEXPECTED_ERROR", status=500)


@bp.get("/<int:user_id>")
@jwt_required()
@admin_required
def get_user_route(user_id: int):
    try:
        result = get_user_by_id(user_id)
        if result["success"]:
            return _ok(result["message"], data=result["data"], status=200)
        else:
            status_code = 404 if result["error_code"] == "USER_NOT_FOUND" else 400
            return _err(result["message"], error_code=result.get("error_code"), status=status_code)
    except Exception as e:
        return _err(f"Unexpected error occurred: {str(e)}", error_code="UNEXPECTED_ERROR", status=500)


@bp.post("/")
@jwt_required()
@admin_required
def create_user_route():
    data: Dict[str, Any] = request.get_json(force=True) or {}
    try:
        result = create_user(data)
        if result["success"]:
            return _ok(result["message"], data=result["data"], status=201)
        else:
            status_code = 400
            if result["error_code"] in ["USERNAME_EXISTS", "EMAIL_EXISTS"]:
                status_code = 409
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            return _err(
                result["message"],
                error_code=result.get("error_code"),
                status=status_code,
                details=result.get("details", {}),
            )
    except Exception as e:
        return _err(f"Unexpected error occurred: {str(e)}", error_code="UNEXPECTED_ERROR", status=500)


@bp.put("/<int:user_id>")
@jwt_required()
@admin_required
def update_user_route(user_id: int):
    updates = request.get_json(force=True) or {}
    try:
        result = update_user(user_id, updates)
        if result["success"]:
            return _ok(result["message"], data=result["data"], status=200)
        else:
            status_code = 400 if result["error_code"] != "USER_NOT_FOUND" else 404
            return _err(result["message"], error_code=result.get("error_code"), status=status_code)
    except Exception as e:
        return _err(f"Unexpected error occurred: {str(e)}", error_code="UNEXPECTED_ERROR", status=500)


@bp.delete("/<int:user_id>")
@jwt_required()
@admin_required
def delete_user_route(user_id: int):
    try:
        result = delete_user(user_id)
        if result["success"]:
            return _ok(result["message"], status=200)
        else:
            status_code = 404 if result["error_code"] == "USER_NOT_FOUND" else 400
            return _err(result["message"], error_code=result.get("error_code"), status=status_code)
    except Exception as e:
        return _err(f"Unexpected error occurred: {str(e)}", error_code="UNEXPECTED_ERROR", status=500)
