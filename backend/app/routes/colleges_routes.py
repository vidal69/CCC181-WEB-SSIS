from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from typing import Dict, Any
from ..utils.format_response import format_response
from ..controller.colleges_controller import (
    search_colleges,
    get_college,
    get_all_colleges,
    create_college,
    update_college,
    delete_college,
)

bp = Blueprint("colleges", __name__)


def _ok(message, data=None, status=200, meta=None):
    payload = {"status": "success", "message": message}
    if data is not None:
        payload["data"] = data
    if meta is not None:
        payload["meta"] = meta
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
def list_colleges():
    try:
        try:
            page = max(int(request.args.get("page", 1)), 1)
            page_size = max(min(int(request.args.get("page_size", 50)), 100), 1)
        except ValueError:
            return format_response({
                "status": "error", 
                "message": "Invalid pagination parameters",
                "error_code": "INVALID_PAGINATION"
            }, 400)
    
        sort_by = request.args.get("sort_by", "college_code")
        sort_order = request.args.get("sort_order", "ASC").upper()
        search_term = request.args.get("q", "")
        search_by = request.args.get("search_by", "")

        result = search_colleges(
            sort_by=sort_by,
            sort_order=sort_order,
            search_term=search_term,
            search_by=search_by,
            page=page,
            page_size=page_size,
        )

        if result["success"]:
            meta = {"page": result["page"], "per_page": result["page_size"], "total": result["total_count"]}
            return _ok(result["message"], data=result["data"], status=200, meta=meta)
        else:
            return _err(result["message"], error_code=result.get("error_code"), status=500)

    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/")
@jwt_required()
def create_college_route():
    data: Dict[str, Any] = request.get_json(force=True) or {}
    try:
        result = create_college(data)
        
        if result["success"]:
            return _ok(result["message"], data=result["data"], status=201)
        else:
            status_code = 400
            if result["error_code"] == "COLLEGE_CODE_EXISTS":
                status_code = 409  # Conflict
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            return _err(
                result["message"],
                error_code=result.get("error_code"),
                status=status_code,
                details=result.get("details", {}),
            )
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.put("/<college_code>")
@jwt_required()
def update_college_route(college_code: str):
    updates = request.get_json(force=True) or {}
    try:
        result = update_college(college_code, updates)
        
        if result["success"]:
            return _ok(result["message"], data=result["data"], status=200)
        else:
            status_code = 400
            if result["error_code"] == "COLLEGE_NOT_FOUND":
                status_code = 404
            elif result["error_code"] == "COLLEGE_CODE_EXISTS":
                status_code = 409  # Conflict
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            return _err(
                result["message"],
                error_code=result.get("error_code"),
                status=status_code,
                details=result.get("details", {}),
            )
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.delete("/<college_code>")
@jwt_required()
def delete_college_route(college_code: str):
    try:
        result = delete_college(college_code)
        
        if result["success"]:
            return _ok(result["message"], status=200)
        else:
            status_code = 400
            if result["error_code"] == "COLLEGE_NOT_FOUND":
                status_code = 404
            elif result["error_code"] == "COLLEGE_HAS_PROGRAMS":
                status_code = 409  # Conflict
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            return _err(
                result["message"],
                error_code=result.get("error_code"),
                status=status_code,
                details=result.get("details", {}),
            )
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)
