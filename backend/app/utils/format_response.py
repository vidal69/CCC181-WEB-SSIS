"""Small utilities for building HTTP responses.

This module keeps a minimal surface area so other modules can
consistently return JSON responses. The implementation uses
`flask.jsonify` so the structure and headers are handled by
Flask; the public API (`format_response`) is preserved.
"""

from typing import Dict, Any
from flask import Response, jsonify


def format_response(payload: Dict[str, Any], status: int = 200) -> Response:
    """Return a Flask JSON `Response` with a consistent status code.

    Args:
        payload: The JSON-serializable body to return.
        status: HTTP status code (default 200).

    Returns:
        A Flask `Response` with `application/json` mimetype.
    """
    resp = jsonify(payload)
    resp.status_code = status
    return resp