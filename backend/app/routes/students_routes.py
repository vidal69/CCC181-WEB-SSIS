from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from typing import Dict, Any
import logging
import os
import uuid
from ..utils.format_response import format_response
from ..supabase_client import supabase
from ..controller.student_controller import (
    search_students,
    get_student,
    get_students_by_program,
    get_all_students,
    create_student,
    update_student,
    delete_student
)

bp = Blueprint("students", __name__)
bucket = os.environ.get("SUPABASE_BUCKET_NAME", "ssis_web_bucket")

@bp.get("/")
@jwt_required()
def list_students_route():
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

        sort_by = request.args.get("sort_by", "id_number")
        sort_order = request.args.get("sort_order", "ASC").upper()
        search_term = request.args.get("q", "")
        search_by = request.args.get("search_by", "")

        gender = request.args.get("gender", "")
        year_level = request.args.get("year_level", "")
        program_code = request.args.get("program_code", "")

        result = search_students(
            sort_by=sort_by,
            sort_order=sort_order,
            search_term=search_term,
            search_by=search_by,
            page=page,
            page_size=page_size,
            gender=gender if gender else None,
            year_level=year_level if year_level else None,
            program_code=program_code if program_code else None,
        )

        if result["success"]:
            return format_response({
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
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"]
            }, 500)
    
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/")
@jwt_required()
def create_student_route():
    data: Dict[str, Any] = request.get_json(force=True) or {}
    try:
        result = create_student(data)
        
        if result["success"]:
            return format_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 201)
        else:
            status_code = 400
            if result["error_code"] == "STUDENT_ID_EXISTS":
                status_code = 409  # Conflict
            elif result["error_code"] == "PROGRAM_NOT_FOUND":
                status_code = 400
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"],
                "details": result.get("details", {})
            }, status_code)
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.get("/<id_number>")
@jwt_required()
def get_student_route(id_number: str):
    try:
        result = get_student(id_number)
        
        if result["success"]:
            return format_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 200)
        else:
            status_code = 400
            if result["error_code"] == "STUDENT_NOT_FOUND":
                status_code = 404
            
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"]
            }, status_code)
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.put("/<id_number>")
@jwt_required()
def update_student_route(id_number: str):
    updates = request.get_json(force=True) or {}
    try:
        result = update_student(id_number, updates)
        
        if result["success"]:
            return format_response({
                "status": "success",
                "message": result["message"],
                "data": result["data"]
            }, 200)
        else:
            status_code = 400
            if result["error_code"] == "STUDENT_NOT_FOUND":
                status_code = 404
            elif result["error_code"] == "STUDENT_ID_EXISTS":
                status_code = 409  # Conflict
            elif result["error_code"] == "PROGRAM_NOT_FOUND":
                status_code = 400
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"],
                "details": result.get("details", {})
            }, status_code)
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.delete("/<id_number>")
@jwt_required()
def delete_student_route(id_number: str):
    try:
        result = delete_student(id_number)
        
        if result["success"]:
            return format_response({
                "status": "success",
                "message": result["message"]
            }, 200)
        else:
            status_code = 400
            if result["error_code"] == "STUDENT_NOT_FOUND":
                status_code = 404
            elif result["error_code"] == "DATABASE_ERROR":
                status_code = 500
            
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"],
                "details": result.get("details", {})
            }, status_code)
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/<id_number>/avatar/photo-upload-url")
@jwt_required()
def get_signed_upload_url(id_number: str):
    """Generate signed upload URL for student avatar"""
    try:
        data = request.get_json() or {}
        filename = data.get("filename")
        content_type = data.get("content_type", "image/jpeg")

        if not filename:
            return format_response({
                "status": "error",
                "message": "Filename is required",
                "error_code": "MISSING_FILENAME"
            }, 400)

        # Validate content type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
        if content_type not in allowed_types:
            return format_response({
                "status": "error",
                "message": f"Invalid content type. Allowed: {', '.join(allowed_types)}",
                "error_code": "INVALID_CONTENT_TYPE"
            }, 400)
        
        student_result = get_student(id_number)
        if not student_result["success"]:
            return format_response({
                "status": "error",
                "message": "Student not found",
                "error_code": "STUDENT_NOT_FOUND"
            }, 404)
        
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        object_path = f"avatars/{id_number}/{uuid.uuid4()}.{file_extension}"
        
        response = supabase.storage.from_(bucket).create_signed_upload_url(
            object_path,
        )
        
        if "error" in response or "statusCode" in response:
            return format_response({
                "status": "error",
                "message": f"Failed to generate upload URL: {response}",
                "error_code": "UPLOAD_URL_ERROR"
            }, 500)
            
        # Return direct data structure expected by frontend
        return format_response({
            "upload_url": response.get("signedURL") or response.get("signedUrl"),
            "avatar_path": object_path,
            "expires_in": 3600
        }, 200)
        
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.post("/<id_number>/avatar/confirm")
@jwt_required()
def confirm_avatar_upload(id_number: str):
    """Confirm avatar upload and update student record"""
    try:
        data = request.get_json() or {}
        avatar_path = data.get("avatar_path")
        
        if not avatar_path:
            return format_response({
                "status": "error",
                "message": "Avatar path is required",
                "error_code": "MISSING_AVATAR_PATH"
            }, 400)
        
        result = update_student(id_number, {"photo_path": avatar_path})
        
        if result["success"]:
            # Return direct student data expected by frontend
            return format_response(result["data"], 200)
        else:
            status_code = 400
            if result["error_code"] == "STUDENT_NOT_FOUND":
                status_code = 404
            
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"]
            }, status_code)
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)


@bp.get("/<id_number>/avatar/url")
@jwt_required()
def get_avatar_url(id_number: str):
    """Get signed URL for viewing student avatar"""
    try:
        student_result = get_student(id_number)
        if not student_result["success"]:
            return format_response({
                "status": "error",
                "message": "Student not found",
                "error_code": "STUDENT_NOT_FOUND"
            }, 404)
        
        student_data = student_result["data"]
        avatar_path = student_data.get("photo_path")
        
        if not avatar_path:
            # Return structure expected by frontend
            return format_response({"avatar_url": None}, 200)
        
        # Generate signed URL for viewing (5 minute expiry)
        response = supabase.storage.from_(bucket).create_signed_url(
            avatar_path,
            300
        )
        
        if hasattr(response, 'error') and response.error:
            return format_response({
                "status": "error",
                "message": f"Failed to generate avatar URL: {response.error.message}",
                "error_code": "AVATAR_URL_ERROR"
            }, 500)
        
        # Return direct data structure expected by frontend
        return format_response({
            "avatar_url": response.get("signedURL") or response.get("signedUrl"),
            "expires_in": 300
        }, 200)
        
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)



@bp.delete("/<id_number>/avatar")
@jwt_required()
def delete_avatar_route(id_number: str):
    """Delete student avatar from storage and update student record"""
    try:
        student_result = get_student(id_number)
        if not student_result["success"]:
            return format_response({
                "status": "error",
                "message": "Student not found",
                "error_code": "STUDENT_NOT_FOUND"
            }, 404)
        
        student_data = student_result["data"]
        avatar_path = student_data.get("photo_path")
        
        if not avatar_path:
            return format_response({
                "status": "success",
                "message": "No avatar to delete"
            }, 200)
        
        # Remove leading slash if present
        if avatar_path.startswith('/'):
            avatar_path = avatar_path[1:]
        
        # Delete from storage
        response = supabase.storage.from_(bucket).remove([avatar_path])
        
        if hasattr(response, 'error') and response.error:
            return format_response({
                "status": "error",
                "message": f"Failed to delete avatar from storage: {response.error.message}",
                "error_code": "AVATAR_DELETE_ERROR"
            }, 500)
        
        # Update student record to remove photo_path
        result = update_student(id_number, {"photo_path": ""})
        
        if result["success"]:
            return format_response({
                "status": "success",
                "message": "Avatar deleted successfully",
                "data": result["data"]
            }, 200)
        else:
            return format_response({
                "status": "error",
                "message": result["message"],
                "error_code": result["error_code"]
            }, 500)
            
    except Exception as e:
        return format_response({
            "status": "error", 
            "message": f"Unexpected error occurred: {str(e)}",
            "error_code": "UNEXPECTED_ERROR"
        }, 500)