from flask_jwt_extended import get_jwt_identity
from ..utils.route_utils import make_response
from ..models import User

def admin_required(func):
    """Decorator to restrict route access to admin users only."""
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        current_user_id = get_jwt_identity()
        user = User.find_by_id(current_user_id)

        if not user or user.role != "admin":
            return make_response({
                "status": "error",
                "message": "Admin privileges required",
                "error_code": "UNAUTHORIZED_ACCESS"
            }, 403)
        return func(*args, **kwargs)
    return wrapper