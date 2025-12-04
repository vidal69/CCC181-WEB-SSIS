from typing import Dict, Any
from flask import Response, json

def make_response(payload: Dict[str, Any], status: int = 200) -> Response:
    """Helper to return JSON responses consistently."""
    return Response(
        response=json.dumps(payload),
        status=status,
        mimetype="application/json"
    )