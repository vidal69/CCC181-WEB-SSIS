from datetime import timedelta
from pathlib import Path
from typing import Dict

from flask import Flask, jsonify, send_from_directory, abort
from flask_cors import CORS
from flask_jwt_extended import JWTManager

import os

from db.database import close_db

# JWT manager instance kept at module level so extensions can import it
jwt = JWTManager()


def _build_config_from_env() -> Dict:
    """Assemble app configuration from environment variables.

    Keeping values explicit here makes it easier to scan and test.
    """

    return {
        "SECRET_KEY": os.environ.get("SECRET_KEY", "dev"),
        "API_PREFIX": os.environ.get("API_PREFIX", "/api"),
        "DB_NAME": os.environ.get("DB_NAME"),
        "DB_USERNAME": os.environ.get("DB_USERNAME"),
        "DB_PASSWORD": os.environ.get("DB_PASSWORD"),
        "DB_HOST": os.environ.get("DB_HOST", "localhost"),
        "DB_PORT": os.environ.get("DB_PORT", "5432"),
        
        # JWT Configuration - FIXED
        "JWT_SECRET_KEY": os.environ.get("JWT_SECRET_KEY", "super-secret-change-this"),
        "JWT_TOKEN_LOCATION": ["cookies"],
        
        # Cookie names - EXPLICITLY SET
        "JWT_ACCESS_COOKIE_NAME": "access_token_cookie",
        "JWT_REFRESH_COOKIE_NAME": "refresh_token_cookie",
        
        # Cookie settings
        "JWT_COOKIE_SECURE": False,  # True in production with HTTPS
        "JWT_COOKIE_HTTPONLY": True,
        "JWT_COOKIE_SAMESITE": "Lax",  # Changed from "Strict" to "Lax" for cross-origin
        "JWT_COOKIE_CSRF_PROTECT": False,  # Already set
        
        # Cookie paths - IMPORTANT!
        "JWT_ACCESS_COOKIE_PATH": "/",
        "JWT_REFRESH_COOKIE_PATH": "/api/auth/refresh",
        
        # Token expiration
        "JWT_ACCESS_TOKEN_EXPIRES": timedelta(hours=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_HOURS", 1))),
        "JWT_REFRESH_TOKEN_EXPIRES": timedelta(days=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 10))),
    }


def _register_blueprints(app: Flask) -> None:
    """Import and register all route blueprints on the provided app.

    The imports are inside the function to avoid circular imports during
    extension initialization or testing.
    """
    from .routes.students_routes import bp as students_bp
    from .routes.programs_routes import bp as programs_bp
    from .routes.colleges_routes import bp as colleges_bp
    from .routes.auth_routes import bp as auth_bp
    from .routes.users_routes import bp as users_bp

    base = app.config["API_PREFIX"]
    app.register_blueprint(auth_bp, url_prefix=f"{base}/auth")
    app.register_blueprint(colleges_bp, url_prefix=f"{base}/colleges")
    app.register_blueprint(programs_bp, url_prefix=f"{base}/programs")
    app.register_blueprint(students_bp, url_prefix=f"{base}/students")
    app.register_blueprint(users_bp, url_prefix=f"{base}/users")


def _register_spa_catchall(app: Flask, dist_folder: Path) -> None:
    """Register a simple catch-all route that serves the frontend's index.html.

    Routes beginning with the API prefix ("api/") return 404 so API routes
    are not conflated with the SPA entrypoint.
    """

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def _catch_all(path: str):
        # Don't handle API routes - they should 404 if not matched
        if path.startswith('api/'):
            return abort(404)
        
        # Check if the path is a file in the dist folder
        file_path = dist_folder / path
        if file_path.exists() and file_path.is_file():
            return send_from_directory(str(dist_folder), path)
        
        # Otherwise serve index.html for SPA routing
        index_path = dist_folder / 'index.html'
        if index_path.exists():
            return send_from_directory(str(dist_folder), 'index.html')

        # Keep this message as a helpful developer hint when frontend isn't built
        return "Index not built. Run 'npm run build' in the frontend directory.", 500


def create_app() -> Flask:
    """Application factory for the Flask app.

    This sets up configuration, extensions, blueprints, and a small SPA
    catch-all handler. Behavior and config keys are unchanged from the
    original implementation.
    """
    # Resolve project layout relative to this package
    base_dir = Path(__file__).resolve().parent
    root_dir = base_dir.parent
    
    # Vite outputs directly to backend/dist
    dist_dir = root_dir / 'dist'

    app = Flask(
        __name__,
        # Serve static files directly from the dist folder
        static_folder=str(dist_dir),
        static_url_path='/',
        template_folder=str(dist_dir),  # Also use dist for templates
    )

    # Load settings and apply them explicitly (easier to test and override)
    app.config.update(_build_config_from_env())

    # Database teardown and routing preferences
    app.teardown_appcontext(close_db)
    app.url_map.strict_slashes = False

    # CORS: allow local frontend during development; keep credentials enabled
    # Include the Vite dev server origin (localhost:5173) so requests from the frontend
    # won't be blocked during development. Also allow common headers used by the app.
    CORS(
        app,
        supports_credentials=True,
        origins=["http://localhost:5173", "http://127.0.0.1:5173", 
                "http://localhost:5001", "http://127.0.0.1:5001"],
        expose_headers=["Content-Type", "Set-Cookie"],
        allow_headers=["Content-Type", "Authorization", "Accept", "Origin"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )

    app.config["JWT_COOKIE_CSRF_PROTECT"] = False

    # Initialize JWT manager
    jwt.init_app(app)

    # Simple health-check route
    @app.route(app.config["API_PREFIX"] + "/health", methods=["GET"])
    def health() -> dict:  # pragma: no cover - trivial
        return jsonify({"status": "ok"})

    # Blueprints and SPA handler - pass dist_dir to the catchall handler
    _register_blueprints(app)
    _register_spa_catchall(app, dist_dir)

    return app