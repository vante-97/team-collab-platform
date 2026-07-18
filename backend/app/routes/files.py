"""文件管理 API 路由"""
import os
import re
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.extensions import db
from app.models.project import Project
from app.models.project_file import ProjectFile
from app.models.team_member import TeamMember

files_bp = Blueprint("files", __name__)


# 允许上传的文件扩展名白名单
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp",
    ".txt", ".md", ".json", ".xml", ".csv", ".log", ".yaml", ".yml",
    ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".sql",
    ".zip", ".tar", ".gz",
}
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50MB 单文件限制


def _get_upload_dir():
    return os.path.abspath(os.path.join(current_app.root_path, "..", "uploads"))


def _ok(data=None, message="success", code=200):
    return jsonify({
        "code": code, "message": message, "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


def _fail(message, code=400):
    return jsonify({
        "code": code, "message": message, "data": None,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


def _get_file_type(ext):
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


def _sanitize_filename(filename: str) -> str:
    safe = re.sub(r'[^\w\u4e00-\u9fff.\- ]', '_', filename)
    if safe.startswith('.') or not safe.strip():
        safe = 'untitled'
    return safe.strip()


@files_bp.route("/api/projects/<int:project_id>/files", methods=["GET", "POST"])
@jwt_required()
def project_files(project_id):
    user_id = int(get_jwt_identity())
    proj = Project.query.get(project_id)
    if not proj:
        return _fail("项目不存在", 404)

    current_member = TeamMember.query.filter_by(user_id=user_id, project_id=project_id).first()
    if not current_member:
        return _fail("你不是该项目的成员，无权操作", 403)

    if request.method == "GET":
        files = ProjectFile.query.filter_by(project_id=project_id)\
            .order_by(ProjectFile.created_at.desc()).all()
        return _ok([f.to_dict() for f in files])

    elif request.method == "POST":
        if "file" not in request.files:
            return _fail("请选择要上传的文件", 400)
        file = request.files["file"]
        if not file.filename:
            return _fail("请选择要上传的文件", 400)

        original_name = _sanitize_filename(file.filename)
        ext = os.path.splitext(original_name)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            return _fail(f"不支持的文件类型: {ext}。允许的类型: {', '.join(sorted(ALLOWED_EXTENSIONS))}", 400)

        content_length = request.content_length
        if content_length and content_length > MAX_UPLOAD_SIZE:
            return _fail(f"文件大小超过限制（最大 {MAX_UPLOAD_SIZE // (1024*1024)}MB）", 400)

        upload_dir = _get_upload_dir()
        os.makedirs(upload_dir, exist_ok=True)
        unique_name = f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}_{user_id}{ext}"
        file_path = os.path.join(upload_dir, unique_name)

        file.save(file_path)
        file_size = os.path.getsize(file_path)

        if file_size > MAX_UPLOAD_SIZE:
            os.remove(file_path)
            return _fail(f"文件大小超过限制（最大 {MAX_UPLOAD_SIZE // (1024*1024)}MB）", 400)

        file_type = _get_file_type(ext)

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
        return _ok(pf.to_dict(), "文件上传成功", 201)


@files_bp.route("/api/files/<int:file_id>", methods=["GET", "DELETE"])
@jwt_required()
def file_detail(file_id):
    pf = ProjectFile.query.get(file_id)
    if not pf:
        return _fail("文件不存在", 404)

    if request.method == "GET":
        return _ok(pf.to_dict())

    elif request.method == "DELETE":
        upload_dir = _get_upload_dir()
        file_path = os.path.join(upload_dir, pf.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        db.session.delete(pf)
        db.session.commit()
        return _ok(None, "文件已删除")


@files_bp.route("/api/files/<int:file_id>/download", methods=["GET"])
def download_file(file_id):
    """下载/预览文件（通过 token 查询参数或 Authorization header 认证）"""
    token = request.args.get("token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        return _fail("请先登录", 401)

    try:
        decode_token(token)
    except (ExpiredSignatureError, InvalidTokenError, Exception):
        return _fail("登录已过期，请重新登录", 401)

    pf = ProjectFile.query.get(file_id)
    if not pf:
        return _fail("文件不存在", 404)

    upload_dir = _get_upload_dir()
    file_path = os.path.join(upload_dir, pf.filename)
    if not os.path.exists(file_path):
        return _fail("文件已被删除", 404)

    return send_file(file_path, download_name=pf.original_name, as_attachment=False)
