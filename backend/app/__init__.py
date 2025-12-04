from datetime import timedelta
from flask import Flask, jsonify, send_from_directory, abort

from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from .db.database import close_db

jwt = JWTManager()

def create_app() -> Flask:
    """Flask application factory."""
    base_dir = os.path.abspath(os.path.dirname(__file__))
    root_dir = os.path.abspath(os.path.join(base_dir, ".."))

    app = Flask(
        __name__,
        static_folder=os.path.join(root_dir, "static"),
        template_folder=os.path.join(root_dir, "templates")
    )

    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev"),
        API_PREFIX=os.environ.get("API_PREFIX", "/api"),
        DB_NAME=os.environ.get("DB_NAME"),
        DB_USERNAME=os.environ.get("DB_USERNAME"),
        DB_PASSWORD=os.environ.get("DB_PASSWORD"),
        DB_HOST=os.environ.get("DB_HOST", "localhost"),
        DB_PORT=os.environ.get("DB_PORT", "5432"),
        JWT_SECRET_KEY=os.environ.get("JWT_SECRET_KEY", "super-secret"),
        JWT_TOKEN_LOCATION=["cookies"],
        JWT_COOKIE_SECURE=False,  # True in production (HTTPS only)
        JWT_COOKIE_HTTPONLY=True,
        JWT_COOKIE_SAMESITE="Lax",
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_HOURS", 1))),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 10))),
    )
    
    app.teardown_appcontext(close_db)
    app.url_map.strict_slashes = False

    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}}, supports_credentials=True)
    
    jwt.init_app(app)

    @app.route(app.config["API_PREFIX"] + "/health", methods=["GET"])
    def health() -> dict:
        """Health check endpoint."""
        return jsonify({"status": "ok"})

    # Blueprints
    from .routes.students import bp as students_bp
    from .routes.programs import bp as programs_bp
    from .routes.colleges import bp as colleges_bp
    from .routes.auth import bp as auth_bp
    from .routes.users import bp as users_bp

    base = app.config["API_PREFIX"]
    app.register_blueprint(auth_bp, url_prefix=f"{base}/auth")
    app.register_blueprint(colleges_bp, url_prefix=f"{base}/colleges")
    app.register_blueprint(programs_bp, url_prefix=f"{base}/programs")
    app.register_blueprint(students_bp, url_prefix=f"{base}/students")
    app.register_blueprint(users_bp, url_prefix=f"{base}/users")

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        if path.startswith('api/'):
            return abort(404)
        
        index_path = os.path.join(app.template_folder, 'index.html')
        
        if os.path.exists(index_path):
            return send_from_directory(app.template_folder, 'index.html')
        
        return "Index not built. Run frontend build: npm run build:flask", 500

    return app
