"""Team Collab Platform - Flask Backend v2"""
import os
import time
from functools import wraps
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
# 安全：生产环境必须通过环境变量设置，本地开发使用自动生成的随机密钥
import secrets
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or secrets.token_hex(32)
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY") or secrets.token_hex(32)
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=30)

# ---- CORS 配置 ----
CORS(app, origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"], supports_credentials=True,
     expose_headers=["Authorization"], allow_headers=["Content-Type", "Authorization"])

# ---- 简易速率限制 ----
RATE_LIMIT_STORE: dict[str, list[float]] = {}

def rate_limit(max_requests: int = 20, window_seconds: int = 60):
    """简易速率限制装饰器：每 window_seconds 秒最多 max_requests 次请求"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            key = f"rate_{request.remote_addr}_{f.__name__}"
            now = time.time()
            if key not in RATE_LIMIT_STORE:
                RATE_LIMIT_STORE[key] = []
            # 清理过期记录
            RATE_LIMIT_STORE[key] = [t for t in RATE_LIMIT_STORE[key] if now - t < window_seconds]
            if len(RATE_LIMIT_STORE[key]) >= max_requests:
                return fail("请求过于频繁，请稍后再试", 429)
            RATE_LIMIT_STORE[key].append(now)
            return f(*args, **kwargs)
        return wrapper
    return decorator

# ---- 数据库配置 (SQLite) ----
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(BASE_DIR, 'data.db')}"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 最大上传 50MB

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


# ---- 文件模型 ----
class ProjectFile(db.Model):
    __tablename__ = "project_files"
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(500), nullable=False)
    original_name = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, default=0)  # 字节
    file_type = db.Column(db.String(50), default="")  # pdf, image, doc, other
    uploader_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    uploader = db.relationship("User", backref="files", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "original_name": self.original_name,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "uploader_id": self.uploader_id,
            "uploader_name": self.uploader.username if self.uploader else None,
            "project_id": self.project_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
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


# ---- 邀请模型 ----
class Invitation(db.Model):
    __tablename__ = "invitations"
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    invitee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(db.String(20), default="member")  # admin / member / viewer
    status = db.Column(db.String(20), default="pending")  # pending / accepted / rejected
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    project = db.relationship("Project", backref="invitations", lazy=True)
    inviter = db.relationship("User", foreign_keys=[inviter_id], backref="sent_invitations", lazy=True)
    invitee = db.relationship("User", foreign_keys=[invitee_id], backref="received_invitations", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "project_name": self.project.name if self.project else None,
            "inviter_id": self.inviter_id,
            "inviter_name": self.inviter.username if self.inviter else None,
            "invitee_id": self.invitee_id,
            "invitee_name": self.invitee.username if self.invitee else None,
            "role": self.role,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
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
@rate_limit(max_requests=5, window_seconds=60)
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
@rate_limit(max_requests=10, window_seconds=60)
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
        # 只返回当前用户参与的项目
        member_project_ids = [m.project_id for m in TeamMember.query.filter_by(user_id=user_id).all()]
        projects_list = Project.query.filter(Project.id.in_(member_project_ids)).order_by(Project.updated_at.desc()).all() if member_project_ids else []
        return ok([p.to_dict() for p in projects_list])

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        name = data.get("name", "").strip()
        if not name:
            return fail("项目名称不能为空", 400)

        # 确保 JWT 中的用户真实存在，防止删库后旧 token 继续创建脏数据
        current_user = User.query.get(user_id)
        if not current_user:
            return fail("登录状态已失效，请重新登录", 401)

        proj = Project(
            name=name,
            description=data.get("description", "").strip(),
            status=data.get("status", "planning"),
            owner_id=user_id,
        )
        db.session.add(proj)
        db.session.commit()

        # 创建者自动加入项目，成为 owner
        membership = TeamMember(user_id=user_id, project_id=proj.id, role="owner")
        db.session.add(membership)
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
        projects_data = []
        if Project.query.count() == 0:
            owner = User.query.filter_by(username="testuser1").first()
            projects_data = [
                Project(name="测试样例项目", description="这是一个测试项目，用于验证前后端连通性",
                        status="active", owner_id=owner.id if owner else None),
                Project(name="前端重构", description="使用 Next.js 14 重构前端页面",
                        status="planning", owner_id=owner.id if owner else None),
                Project(name="API 文档编写", description="编写完整的 REST API 文档",
                        status="completed", owner_id=owner.id if owner else None),
            ]
            db.session.add_all(projects_data)
            db.session.commit()
            print("[DB] 示例项目已插入。")

            # 只在首次创建示例项目时，给示例项目绑定示例成员关系
            owner = User.query.filter_by(username="testuser1").first()
            admin = User.query.filter_by(username="admin").first()
            member = User.query.filter_by(username="testuser2").first()
            for proj in projects_data:
                existing_user_ids = {m.user_id for m in TeamMember.query.filter_by(project_id=proj.id).all()}
                memberships = []
                if owner and owner.id not in existing_user_ids:
                    memberships.append(TeamMember(user_id=owner.id, project_id=proj.id, role="owner"))
                if admin and admin.id not in existing_user_ids:
                    memberships.append(TeamMember(user_id=admin.id, project_id=proj.id, role="admin"))
                if member and member.id not in existing_user_ids:
                    memberships.append(TeamMember(user_id=member.id, project_id=proj.id, role="member"))
                if memberships:
                    db.session.add_all(memberships)
            db.session.commit()
            print("[DB] 示例成员关系已同步。")







# ============ 任务管理 API ============
@app.route("/api/projects/<int:project_id>/tasks", methods=["GET", "POST"])
@jwt_required()
def project_tasks(project_id):
    user_id = int(get_jwt_identity())
    proj = Project.query.get(project_id)
    if not proj:
        return fail("项目不存在", 404)

    # 权限检查：只有项目成员才能查看/创建任务
    current_member = TeamMember.query.filter_by(user_id=user_id, project_id=project_id).first()
    if not current_member:
        return fail("你不是该项目的成员，无权操作", 403)

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
        # 成员列表公开可见（类似 GitHub 的 Contributors）
        members = TeamMember.query.filter_by(project_id=project_id).all()
        return ok([m.to_dict() for m in members])

    elif request.method == "POST":
        # 权限检查：只有 owner 或 admin 才能发送邀请
        current_member = TeamMember.query.filter_by(user_id=user_id, project_id=project_id).first()
        if not current_member or current_member.role not in ("owner", "admin"):
            return fail("你没有权限添加成员", 403)

        data = request.get_json(silent=True) or {}
        invitee_username = data.get("username", "").strip()
        role = data.get("role", "member")

        if not invitee_username:
            return fail("请输入用户名", 400)
        if role not in ("admin", "member", "viewer"):
            return fail("无效的角色", 400)

        # 查找要邀请的用户
        invitee = User.query.filter_by(username=invitee_username).first()
        if not invitee:
            return fail("用户不存在", 404)
        if invitee.id == user_id:
            return fail("不能邀请自己", 400)

        # 检查是否已是成员
        existing = TeamMember.query.filter_by(user_id=invitee.id, project_id=project_id).first()
        if existing:
            return fail("该用户已是项目成员", 400)

        # 检查是否已有待处理的邀请
        pending = Invitation.query.filter_by(
            project_id=project_id, invitee_id=invitee.id, status="pending"
        ).first()
        if pending:
            return fail("已向该用户发送过邀请，请等待对方处理", 400)

        inv = Invitation(
            project_id=project_id,
            inviter_id=user_id,
            invitee_id=invitee.id,
            role=role,
        )
        db.session.add(inv)
        db.session.commit()
        return ok(inv.to_dict(), "邀请已发送", 201)


# ---- 邀请 API ----
@app.route("/api/invitations", methods=["GET"])
@jwt_required()
def get_invitations():
    """获取当前用户的邀请列表（收到的 + 发出的）"""
    user_id = int(get_jwt_identity())
    received = Invitation.query.filter_by(invitee_id=user_id).order_by(Invitation.created_at.desc()).all()
    sent = Invitation.query.filter_by(inviter_id=user_id).order_by(Invitation.created_at.desc()).all()
    return ok({
        "received": [i.to_dict() for i in received],
        "sent": [i.to_dict() for i in sent],
    })


@app.route("/api/invitations/<int:invitation_id>/respond", methods=["PUT"])
@jwt_required()
def respond_invitation(invitation_id):
    """接受或拒绝邀请"""
    user_id = int(get_jwt_identity())
    inv = Invitation.query.get(invitation_id)
    if not inv:
        return fail("邀请不存在", 404)
    if inv.invitee_id != user_id:
        return fail("该邀请不是发给你的", 403)
    if inv.status != "pending":
        return fail("该邀请已被处理", 400)

    data = request.get_json(silent=True) or {}
    action = data.get("action", "").strip()
    if action not in ("accept", "reject"):
        return fail("请选择 accept 或 reject", 400)

    if action == "reject":
        inv.status = "rejected"
        db.session.commit()
        return ok(inv.to_dict(), "已拒绝邀请")

    # accept
    existing = TeamMember.query.filter_by(user_id=user_id, project_id=inv.project_id).first()
    if existing:
        return fail("你已经是该项目的成员", 400)

    membership = TeamMember(user_id=user_id, project_id=inv.project_id, role=inv.role)
    inv.status = "accepted"
    db.session.add(membership)
    db.session.commit()
    return ok({"member": membership.to_dict(), "invitation": inv.to_dict()}, "已加入项目")


@app.route("/api/invitations/unread-count", methods=["GET"])
@jwt_required()
def unread_invitation_count():
    """获取未处理的邀请数量"""
    user_id = int(get_jwt_identity())
    count = Invitation.query.filter_by(invitee_id=user_id, status="pending").count()
    return ok({"count": count})


@app.route("/api/members/<int:member_id>", methods=["PUT", "DELETE"])
@jwt_required()
def member_detail(member_id):
    user_id = int(get_jwt_identity())
    member = TeamMember.query.get(member_id)
    if not member:
        return fail("成员不存在", 404)

    # 权限检查：只有项目 owner/admin 才能修改/移除成员
    current_member = TeamMember.query.filter_by(user_id=user_id, project_id=member.project_id).first()
    if not current_member or current_member.role not in ("owner", "admin"):
        return fail("你没有权限执行此操作", 403)

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


# ---- 文件上传目录 ----
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# 允许上传的文件扩展名白名单
ALLOWED_EXTENSIONS = {
    # 文档
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    # 图片
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp",
    # 文本/代码
    ".txt", ".md", ".json", ".xml", ".csv", ".log", ".yaml", ".yml",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".sql",
    # 压缩包
    ".zip", ".tar", ".gz",
}
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB 单文件限制


def get_file_type(ext):
    ext = ext.lower()
    if ext in (".pdf",):
        return "pdf"
    if ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"):
        return "image"
    if ext in (".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"):
        return "doc"
    if ext in (".txt", ".md", ".json", ".xml", ".csv", ".log", ".yaml", ".yml",
              ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".sql"):
        return "text"
    if ext in (".zip", ".tar", ".gz"):
        return "archive"
    return "other"


def sanitize_filename(filename: str) -> str:
    """移除文件名中的危险字符，防止路径遍历攻击"""
    import re
    # 只保留字母、数字、中文、点、下划线、连字符、空格
    safe = re.sub(r'[^\w\u4e00-\u9fff.\- ]', '_', filename)
    # 防止隐藏文件（以点开头）和空文件名
    if safe.startswith('.') or not safe.strip():
        safe = 'untitled'
    return safe.strip()


# ============ 文件管理 API ============
@app.route("/api/projects/<int:project_id>/files", methods=["GET", "POST"])
@jwt_required()
def project_files(project_id):
    user_id = int(get_jwt_identity())
    proj = Project.query.get(project_id)
    if not proj:
        return fail("项目不存在", 404)

    # 权限检查：只有项目成员才能查看/上传文件
    current_member = TeamMember.query.filter_by(user_id=user_id, project_id=project_id).first()
    if not current_member:
        return fail("你不是该项目的成员，无权操作", 403)

    if request.method == "GET":
        files = ProjectFile.query.filter_by(project_id=project_id)\
            .order_by(ProjectFile.created_at.desc()).all()
        return ok([f.to_dict() for f in files])

    elif request.method == "POST":
        if "file" not in request.files:
            return fail("请选择要上传的文件", 400)
        file = request.files["file"]
        if not file.filename:
            return fail("请选择要上传的文件", 400)

        original_name = sanitize_filename(file.filename)
        ext = os.path.splitext(original_name)[1].lower()

        # 文件类型白名单校验
        if ext not in ALLOWED_EXTENSIONS:
            return fail(f"不支持的文件类型: {ext}。允许的类型: {', '.join(sorted(ALLOWED_EXTENSIONS))}", 400)

        # 文件大小校验（读取前先检查 Content-Length 避免大文件读入内存）
        content_length = request.content_length
        if content_length and content_length > MAX_UPLOAD_SIZE:
            return fail(f"文件大小超过限制（最大 {MAX_UPLOAD_SIZE // (1024*1024)}MB）", 400)

        # 生成唯一文件名
        unique_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}_{user_id}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        file.save(file_path)
        file_size = os.path.getsize(file_path)

        # 保存后再次检查大小（双重保险）
        if file_size > MAX_UPLOAD_SIZE:
            os.remove(file_path)
            return fail(f"文件大小超过限制（最大 {MAX_UPLOAD_SIZE // (1024*1024)}MB）", 400)

        file_type = get_file_type(ext)

        pf = ProjectFile(
            filename=unique_name,
            original_name=original_name,
            file_size=file_size,
            file_type=file_type,
            uploader_id=user_id,
            project_id=project_id,
        )
        db.session.add(pf)
        db.session.commit()
        return ok(pf.to_dict(), "文件上传成功", 201)


@app.route("/api/files/<int:file_id>", methods=["GET", "DELETE"])
@jwt_required()
def file_detail(file_id):
    pf = ProjectFile.query.get(file_id)
    if not pf:
        return fail("文件不存在", 404)

    if request.method == "GET":
        return ok(pf.to_dict())

    elif request.method == "DELETE":
        # 删除物理文件
        file_path = os.path.join(UPLOAD_DIR, pf.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        db.session.delete(pf)
        db.session.commit()
        return ok(None, "文件已删除")


@app.route("/api/files/<int:file_id>/download", methods=["GET"])
def download_file(file_id):
    """下载/预览文件（通过 token 查询参数或 Authorization header 认证）"""
    from flask_jwt_extended import decode_token
    from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

    # 先尝试从 query string 获取 token
    token = request.args.get("token")
    if not token:
        # 再尝试从 Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return fail("请先登录", 401)

    try:
        decode_token(token)
    except (ExpiredSignatureError, InvalidTokenError, Exception):
        return fail("登录已过期，请重新登录", 401)

    pf = ProjectFile.query.get(file_id)
    if not pf:
        return fail("文件不存在", 404)
    file_path = os.path.join(UPLOAD_DIR, pf.filename)
    if not os.path.exists(file_path):
        return fail("文件已被删除", 404)

    from flask import send_file
    return send_file(file_path, download_name=pf.original_name, as_attachment=False)


# ---- 数据统计 API ----
@app.route("/api/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """获取当前用户相关的统计数据"""
    user_id = int(get_jwt_identity())

    # 只统计当前用户参与的项目
    member_rows = TeamMember.query.filter_by(user_id=user_id).all()
    project_ids = [m.project_id for m in member_rows]

    if not project_ids:
        return ok({
            "overview": {"projects": 0, "tasks": 0, "users": 0, "files": 0, "members": 0},
            "tasks": {"todo": 0, "in_progress": 0, "done": 0},
            "projects_status": {"planning": 0, "active": 0, "completed": 0},
            "priority": {"low": 0, "medium": 0, "high": 0, "urgent": 0},
        })

    total_projects = Project.query.filter(Project.id.in_(project_ids)).count()
    total_tasks = Task.query.filter(Task.project_id.in_(project_ids)).count()
    total_users = User.query.count()
    total_files = ProjectFile.query.filter(ProjectFile.project_id.in_(project_ids)).count()

    # 任务状态分布
    todo_count = Task.query.filter(Task.project_id.in_(project_ids), Task.status == "todo").count()
    in_progress_count = Task.query.filter(Task.project_id.in_(project_ids), Task.status == "in_progress").count()
    done_count = Task.query.filter(Task.project_id.in_(project_ids), Task.status == "done").count()

    # 项目状态分布
    planning_count = Project.query.filter(Project.id.in_(project_ids), Project.status == "planning").count()
    active_count = Project.query.filter(Project.id.in_(project_ids), Project.status == "active").count()
    completed_count = Project.query.filter(Project.id.in_(project_ids), Project.status == "completed").count()

    # 当前用户项目下的成员总数（按用户去重）
    total_members = TeamMember.query.filter(TeamMember.project_id.in_(project_ids)).distinct(TeamMember.user_id).count()

    # 按优先级统计任务
    priority_stats = {}
    for p in ["low", "medium", "high", "urgent"]:
        priority_stats[p] = Task.query.filter(Task.project_id.in_(project_ids), Task.priority == p).count()

    return ok({
        "overview": {
            "projects": total_projects,
            "tasks": total_tasks,
            "users": total_users,
            "files": total_files,
            "members": total_members,
        },
        "tasks": {
            "todo": todo_count,
            "in_progress": in_progress_count,
            "done": done_count,
        },
        "projects_status": {
            "planning": planning_count,
            "active": active_count,
            "completed": completed_count,
        },
        "priority": priority_stats,
    })


if __name__ == "__main__":
    init_db()
    debug_mode = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    print(f"[Server] 后端启动: http://localhost:5000 (debug={debug_mode})")
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)
