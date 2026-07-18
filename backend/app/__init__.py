"""Flask 应用工厂"""
import os
from datetime import datetime, timedelta

from flask import Flask, jsonify, request

from app.extensions import db, jwt, TOKEN_BLACKLIST


def create_app():
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-me")
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, '..', 'data.db')}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)
    app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB

    _cors_origins_env = os.environ.get("CORS_ORIGINS", "")
    if _cors_origins_env:
        _cors_origins = [o.strip() for o in _cors_origins_env.split(",")]
    else:
        _cors_origins = [
            "http://localhost:3000",
            "http://localhost:3001",
        ]

    # ---- 全局 OPTIONS 预检处理：必须在任何路由/JWT 之前 ----
    @app.before_request
    def _handle_options():
        if request.method == "OPTIONS":
            origin = request.headers.get("Origin", "")
            allowed = (
                origin.endswith(".railway.app") or
                origin.startswith("http://localhost") or
                origin in _cors_origins
            )
            if allowed:
                resp = app.make_response("")
                resp.status_code = 200
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Access-Control-Allow-Credentials"] = "true"
                resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
                resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
                return resp

    # ---- 动态 CORS：通过 after_request 手动设置 Access-Control-Allow-Origin ----
    @app.after_request
    def _set_cors_headers(response):
        origin = request.headers.get("Origin", "")
        if origin:
            allowed = (
                origin.endswith(".railway.app") or
                origin.startswith("http://localhost") or
                origin in _cors_origins
            )
            if allowed:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    db.init_app(app)
    jwt.init_app(app)

    @jwt.token_in_blocklist_loader
    def _check_blocklist(jwt_header, jwt_payload):
        return jwt_payload["jti"] in TOKEN_BLACKLIST

    # 注册所有蓝图
    from app.routes.auth import auth_bp
    from app.routes.projects import projects_bp
    from app.routes.tasks import tasks_bp
    from app.routes.members import members_bp
    from app.routes.files import files_bp
    from app.routes.stats import stats_bp
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(projects_bp, url_prefix="/api/projects")
    app.register_blueprint(tasks_bp)
    app.register_blueprint(members_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(stats_bp)


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
        from app.models import User, Project, Task, TeamMember, Invitation, ProjectFile  # noqa
        db.create_all()

        # 数据迁移：确保每个项目都有 owner 成员关系（兼容旧数据库）
        try:
            projects = Project.query.all()
            for proj in projects:
                existing = TeamMember.query.filter_by(user_id=proj.owner_id, project_id=proj.id).first()
                if not existing:
                    db.session.add(TeamMember(user_id=proj.owner_id, project_id=proj.id, role="owner"))
            db.session.commit()
        except Exception:
            db.session.rollback()

    return app
