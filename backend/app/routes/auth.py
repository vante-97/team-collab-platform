"""认证 API 路由"""
import re
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
)
import bcrypt

from app.extensions import db, TOKEN_BLACKLIST
from app.models.user import User

auth_bp = Blueprint("auth", __name__)
_EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def _ok(data=None, message="success", code=200):
    return jsonify({"code": code, "message": message, "data": data, "timestamp": datetime.utcnow().isoformat() + "Z"})


def _err(message, code=400):
    return jsonify({"code": code, "message": message, "data": None, "timestamp": datetime.utcnow().isoformat() + "Z"})


# ---- POST /api/auth/register ----
@auth_bp.route("/register", methods=["POST"])
def register():
    body = request.get_json(silent=True) or {}
    username = (body.get("username") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not username or len(username) < 2:
        return _err("用户名至少2个字符")
    if len(username) > 64:
        return _err("用户名不能超过64个字符")
    if not _EMAIL_RE.match(email):
        return _err("邮箱格式不正确")
    if len(password) < 8:
        return _err("密码长度至少8位")

    if User.query.filter_by(username=username).first():
        return _err("用户名已被注册", code=409)
    if User.query.filter_by(email=email).first():
        return _err("邮箱已被注册", code=409)

    pw_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(username=username, email=email, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()

    return _ok(data=user.to_dict(), message="注册成功", code=201)


# ---- POST /api/auth/login ----
@auth_bp.route("/login", methods=["POST"])
def login():
    body = request.get_json(silent=True) or {}
    login_id = (body.get("username") or body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not login_id or not password:
        return _err("用户名/邮箱和密码不能为空")

    user = User.query.filter((User.username == login_id) | (User.email == login_id)).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return _err("用户名或密码错误", code=401)

    identity = str(user.id)
    return _ok(data={
        "access_token": create_access_token(identity=identity),
        "refresh_token": create_refresh_token(identity=identity),
        "token_type": "Bearer",
        "user": user.to_dict(),
    }, message="登录成功")


# ---- GET /api/auth/me ----
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return _err("用户不存在", code=404)
    return _ok(data=user.to_dict())


# ---- POST /api/auth/refresh ----
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    return _ok(data={
        "access_token": create_access_token(identity=get_jwt_identity()),
        "token_type": "Bearer",
    }, message="Token 刷新成功")


# ---- POST /api/auth/logout ----
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    TOKEN_BLACKLIST.add(get_jwt()["jti"])
    return _ok(message="退出成功")
