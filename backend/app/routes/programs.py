from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from typing import Dict, Any
from ..utils.route_utils import make_response
from ..services.programs_service import (
    search_programs,
    get_program,
    get_programs_by_college,
    get_all_programs,
    create_program,
    update_program,
    delete_program
)

bp = Blueprint("programs", __name__)


@bp.get("/")
@jwt_required()
def list_programs_route():
    try:
        try:
            page = max(int(request.args.get("page", 1)), 1)
            page_size = max(min(int(request.args.get("page_size", 50)), 100), 1)
        except ValueError:
            return make_response({
                "status": "error", 
                "message": "Invalid pagination parameters",
                "error_code": "INVALID_PAGINATION"
            }, 400)

        sort_by = request.args.get("sort_by", "program_code")
        sort_order = request.args.get("sort_order", "ASC").upper()
        search_term = request.args.get("q", "")
        search_by = request.args.get("search_by", "")

        result = search_programs(
            sort_by=sort_by,
            sort_order=sort_order,
            search_term=search_term,
            search_by=search_by,
            page=page,
            page_size=page_size,
        )

        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"],
                "meta": {
                    "page": result["page"], 
                    "per_page": result["page_size"], 
                    "total": result["total_count"]
                },
            }, 200)
        else:
            return make_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"]
            }, 500)

    except Exception as e:
        return make_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/")
@jwt_required()
def create_program_route():
    data: Dict[str, Any] = request.get_json(force=True) or {}
    try:
        result = create_program(data)
        
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 201)
        else:
            status_code = 400
            if result["error_code"] == "PROGRAM_CODE_EXISTS":
                status_code = 409  # Conflict
            elif result["error_code"] == "COLLEGE_NOT_FOUND":
                status_code = 400
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


@bp.put("/<program_code>")
@jwt_required()
def update_program_route(program_code: str):
    updates = request.get_json(force=True) or {}
    try:
        result = update_program(program_code, updates)
        
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 200)
        else:
            status_code = 400
            if result["error_code"] == "PROGRAM_NOT_FOUND":
                status_code = 404
            elif result["error_code"] == "PROGRAM_CODE_EXISTS":
                status_code = 409  # Conflict
            elif result["error_code"] == "COLLEGE_NOT_FOUND":
                status_code = 400
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


@bp.delete("/<program_code>")
@jwt_required()
def delete_program_route(program_code: str):
    try:
        result = delete_program(program_code)
        
        if result["success"]:
            return make_response({
                "status": "success",
                "message": result["message"]
            }, 200)
        else:
            status_code = 400
            if result["error_code"] == "PROGRAM_NOT_FOUND":
                status_code = 404
            elif result["error_code"] == "PROGRAM_HAS_STUDENTS":
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
