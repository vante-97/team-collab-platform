"""Team Collab Platform - Flask Backend"""
import os
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
)
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.url_map.strict_slashes = False

# ---- 密钥配置 ----
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "team-collab-secret-key-change-in-production")
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-change-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

# ---- CORS 配置 ----
CORS(app, origins=["http://localhost:3000"], supports_credentials=True,
     expose_headers=["Authorization"], allow_headers=["Content-Type", "Authorization"])

# ---- 数据库配置 (SQLite) ----
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'data.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)


# ---- 数据模型 ----
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Project(db.Model):
    __tablename__ = "projects"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="planning")
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    owner = db.relationship("User", backref="projects", lazy=True)
    tasks = db.relationship("Task", backref="project", lazy=True, cascade="all, delete-orphan")
    members = db.relationship("TeamMember", backref="project", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status,
            "owner_id": self.owner_id,
            "owner_name": self.owner.username if self.owner else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---- 任务模型 ----
class Task(db.Model):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    description = db.Column(db.Text, default="")
    status = db.Column(db.String(20), default="todo")  # todo / in_progress / done
    priority = db.Column(db.String(10), default="medium")  # low / medium / high / urgent
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    assignee = db.relationship("User", backref="tasks", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "priority": self.priority,
            "assignee_id": self.assignee_id,
            "assignee_name": self.assignee.username if self.assignee else None,
            "project_id": self.project_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ---- 团队成员模型 ----
class TeamMember(db.Model):
    __tablename__ = "team_members"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    role = db.Column(db.String(20), default="member")  # owner / admin / member / viewer
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="memberships", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username if self.user else None,
            "email": self.user.email if self.user else None,
            "project_id": self.project_id,
            "role": self.role,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
        }


# ---- 通用响应包装 ----
def ok(data=None, message="success", code=200):
    return jsonify({"code": code, "message": message, "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat()})


def fail(message="error", code=400, data=None):
    return jsonify({"code": code, "message": message, "data": data,
                    "timestamp": datetime.now(timezone.utc).isoformat()})


# ---- JWT 错误处理 ----
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return fail("登录已过期，请重新登录", 401)

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return fail("无效的登录凭证", 401)

@jwt.unauthorized_loader
def missing_token_callback(error):
    return fail("请先登录", 401)


# ---- 基础路由 ----
@app.route("/")
def home():
    return ok({"status": "ok"}, "Team Collab Platform API")

@app.route("/api/health")
def health_check():
    db_ok = False
    try:
        db.session.execute(db.text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return ok({"status": "healthy", "database": "connected" if db_ok else "disconnected"})


# ---- 认证路由 ----
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")

    if not username or not email or not password:
        return fail("用户名、邮箱和密码不能为空", 400)
    if len(username) < 3:
        return fail("用户名至少3个字符", 400)
    if len(password) < 6:
        return fail("密码至少6个字符", 400)
    if User.query.filter_by(username=username).first():
        return fail("用户名已被注册", 400)
    if User.query.filter_by(email=email).first():
        return fail("邮箱已被注册", 400)

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return ok(user.to_dict(), "注册成功", 201)


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return fail("用户名和密码不能为空", 400)

    # 支持用用户名或邮箱登录
    user = User.query.filter(
        (User.username == username) | (User.email == username)
    ).first()

    if not user or not user.check_password(password):
        return fail("用户名或密码错误", 401)

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return ok({
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
    }, "登录成功")


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return fail("用户不存在", 404)
    return ok(user.to_dict())


@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = int(get_jwt_identity())
    new_token = create_access_token(identity=str(user_id))
    return ok({"access_token": new_token}, "Token 刷新成功")


# ---- 用户列表（需要登录） ----
@app.route("/api/users")
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])


# ---- 项目 CRUD 路由（需要登录） ----
@app.route("/api/projects", methods=["GET", "POST"])
@jwt_required()
def projects():
    user_id = int(get_jwt_identity())

    if request.method == "GET":
        projects_list = Project.query.order_by(Project.updated_at.desc()).all()
        return ok([p.to_dict() for p in projects_list])

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        name = data.get("name", "").strip()
        if not name:
            return fail("项目名称不能为空", 400)
        proj = Project(
            name=name,
            description=data.get("description", "").strip(),
            status=data.get("status", "planning"),
            owner_id=user_id,
        )
        db.session.add(proj)
        db.session.commit()
        return ok(proj.to_dict(), "项目创建成功", 201)


@app.route("/api/projects/<int:project_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
def project_detail(project_id):
    proj = Project.query.get(project_id)
    if not proj:
        return fail("项目不存在", 404)

    if request.method == "GET":
        return ok(proj.to_dict())

    elif request.method == "PUT":
        data = request.get_json(silent=True) or {}
        if "name" in data:
            name = data["name"].strip()
            if not name:
                return fail("项目名称不能为空", 400)
            proj.name = name
        if "description" in data:
            proj.description = data["description"].strip()
        if "status" in data:
            if data["status"] not in ("planning", "active", "completed", "archived"):
                return fail("无效的状态值", 400)
            proj.status = data["status"]
        db.session.commit()
        return ok(proj.to_dict(), "项目更新成功")

    elif request.method == "DELETE":
        db.session.delete(proj)
        db.session.commit()
        return ok(None, "项目已删除")


# ---- 数据库初始化 ----
def init_db():
    with app.app_context():
        db.create_all()
        # 插入示例用户
        if User.query.count() == 0:
            u1 = User(username="testuser1", email="testuser1@team.com")
            u1.set_password("123456")
            u2 = User(username="testuser2", email="testuser2@team.com")
            u2.set_password("123456")
            u3 = User(username="admin", email="admin@team.com")
            u3.set_password("admin123")
            db.session.add_all([u1, u2, u3])
            db.session.commit()
            print("[DB] 示例用户已插入 (testuser1, testuser2, admin)")
        # 插入示例项目
        if Project.query.count() == 0:
            owner = User.query.filter_by(username="testuser1").first()
            db.session.add_all([
                Project(name="测试例熬夜项目", description="这是一个测试项目，用于验证前后端连通性",
                        status="active", owner_id=owner.id if owner else None),
                Project(name="前端重构", description="使用 Next.js 14 重构前端页面",
                        status="planning", owner_id=owner.id if owner else None),
                Project(name="API 文档编写", description="编写完整的 REST API 文档",
                        status="completed", owner_id=owner.id if owner else None),
            ])
            db.session.commit()
            print("[DB] 示例项目已插入。")


# ============ 任务管理 API ============
@app.route("/api/projects/<int:project_id>/tasks", methods=["GET", "POST"])
@jwt_required()
def project_tasks(project_id):
    proj = Project.query.get(project_id)
    if not proj:
        return fail("项目不存在", 404)

    if request.method == "GET":
        tasks = Task.query.filter_by(project_id=project_id).order_by(Task.updated_at.desc()).all()
        return ok([t.to_dict() for t in tasks])

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        if not title:
            return fail("任务标题不能为空", 400)
        task = Task(
            title=title,
            description=data.get("description", "").strip(),
            status=data.get("status", "todo"),
            priority=data.get("priority", "medium"),
            assignee_id=data.get("assignee_id"),
            project_id=project_id,
        )
        db.session.add(task)
        db.session.commit()
        return ok(task.to_dict(), "任务创建成功", 201)


@app.route("/api/tasks/<int:task_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
def task_detail(task_id):
    task = Task.query.get(task_id)
    if not task:
        return fail("任务不存在", 404)

    if request.method == "GET":
        return ok(task.to_dict())

    elif request.method == "PUT":
        data = request.get_json(silent=True) or {}
        if "title" in data:
            title = data["title"].strip()
            if not title:
                return fail("任务标题不能为空", 400)
            task.title = title
        if "description" in data:
            task.description = data["description"].strip()
        if "status" in data:
            if data["status"] not in ("todo", "in_progress", "done"):
                return fail("无效的任务状态", 400)
            task.status = data["status"]
        if "priority" in data:
            if data["priority"] not in ("low", "medium", "high", "urgent"):
                return fail("无效的优先级", 400)
            task.priority = data["priority"]
        if "assignee_id" in data:
            task.assignee_id = data["assignee_id"]
        db.session.commit()
        return ok(task.to_dict(), "任务更新成功")

    elif request.method == "DELETE":
        db.session.delete(task)
        db.session.commit()
        return ok(None, "任务已删除")


@app.route("/api/tasks/<int:task_id>/move", methods=["PUT"])
@jwt_required()
def move_task(task_id):
    """快捷移动任务状态（看板拖拽用）"""
    task = Task.query.get(task_id)
    if not task:
        return fail("任务不存在", 404)
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in ("todo", "in_progress", "done"):
        return fail("无效的任务状态", 400)
    task.status = new_status
    db.session.commit()
    return ok(task.to_dict(), "任务已移动")


# ============ 团队协作 API ============
@app.route("/api/projects/<int:project_id>/members", methods=["GET", "POST"])
@jwt_required()
def project_members(project_id):
    user_id = int(get_jwt_identity())
    proj = Project.query.get(project_id)
    if not proj:
        return fail("项目不存在", 404)

    if request.method == "GET":
        members = TeamMember.query.filter_by(project_id=project_id).all()
        return ok([m.to_dict() for m in members])

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        member_username = data.get("username", "").strip()
        role = data.get("role", "member")

        if not member_username:
            return fail("请输入用户名", 400)
        if role not in ("admin", "member", "viewer"):
            return fail("无效的角色", 400)

        # 查找要添加的用户
        member_user = User.query.filter_by(username=member_username).first()
        if not member_user:
            return fail("用户不存在", 404)

        # 检查是否已是成员
        existing = TeamMember.query.filter_by(user_id=member_user.id, project_id=project_id).first()
        if existing:
            return fail("该用户已是项目成员", 400)

        member = TeamMember(user_id=member_user.id, project_id=project_id, role=role)
        db.session.add(member)
        db.session.commit()
        return ok(member.to_dict(), "成员添加成功", 201)


@app.route("/api/members/<int:member_id>", methods=["PUT", "DELETE"])
@jwt_required()
def member_detail(member_id):
    member = TeamMember.query.get(member_id)
    if not member:
        return fail("成员不存在", 404)

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}
        role = data.get("role")
        if role not in ("admin", "member", "viewer"):
            return fail("无效的角色", 400)
        member.role = role
        db.session.commit()
        return ok(member.to_dict(), "角色已更新")

    elif request.method == "DELETE":
        db.session.delete(member)
        db.session.commit()
        return ok(None, "成员已移除")


if __name__ == "__main__":
    init_db()
    print("[Server] 后端启动: http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
