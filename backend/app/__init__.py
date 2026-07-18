"""Flask 应用工厂"""
import os
from datetime import datetime, timedelta

from flask import Flask, jsonify
from flask_cors import CORS

from app.extensions import db, jwt, TOKEN_BLACKLIST


def create_app():
    app = Flask(__name__)

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, '..', 'data.db')}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

    _cors_origins_env = os.environ.get("CORS_ORIGINS", "")
    if _cors_origins_env:
        _cors_origins = [o.strip() for o in _cors_origins_env.split(",")]
    else:
        _cors_origins = [
            "http://localhost:3000",
            "https://team-collab-platform-ccmx19m5.edgeone.cool",
            "https://team-collab-platform-7thc.vercel.app",
        ]
    CORS(
        app,
        origins=_cors_origins,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    db.init_app(app)
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def _check_blocklist(jwt_header, jwt_payload):
        return jwt_payload["jti"] in TOKEN_BLACKLIST

    from app.routes.auth import auth_bp
    from app.routes.projects import projects_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(projects_bp, url_prefix="/api/projects")

    @app.route("/")
    def home():
        return jsonify({"code": 200, "message": "Team Collab Platform API", "data": {"status": "ok"}, "timestamp": datetime.utcnow().isoformat() + "Z"})

    @app.route("/api/health")
    def health():
        try:
            db.session.execute(db.text("SELECT 1"))
            db_ok = True
        except Exception:
            db_ok = False
        return jsonify({"code": 200, "message": "success", "data": {"status": "healthy", "database": "connected" if db_ok else "disconnected"}, "timestamp": datetime.utcnow().isoformat() + "Z"})

    with app.app_context():
        from app.models import User, Project  # noqa
        db.create_all()

    return app
