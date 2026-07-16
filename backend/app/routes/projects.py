"""项目管理 API 路由"""
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.project import Project

projects_bp = Blueprint("projects", __name__)


def _ok(data=None, message="success", code=200):
    return jsonify({
        "code": code, "message": message, "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


def _err(message, code=400):
    return jsonify({
        "code": code, "message": message, "data": None,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


def _get_project_or_404(project_id, user_id):
    """获取项目并校验所有权"""
    project = db.session.get(Project, project_id)
    if not project:
        return None, _err("项目不存在", code=404)
    if project.owner_id != user_id:
        return None, _err("无权操作此项目", code=403)
    return project, None


# ---- POST /api/projects ----
@projects_bp.route("/", methods=["POST"])
@jwt_required()
def create_project():
    try:
        body = request.get_json(silent=True) or {}
        name = (body.get("name") or "").strip()
        description = (body.get("description") or "").strip() or None
        status = (body.get("status") or "planning").strip()

        if not name:
            return _err("项目名称不能为空")

        if len(name) > 128:
            return _err("项目名称不能超过128个字符")

        if status not in Project.VALID_STATUSES:
            return _err(f"无效的状态值，可选：{', '.join(Project.VALID_STATUSES)}")

        user_id = int(get_jwt_identity())
        project = Project(
            name=name,
            description=description,
            owner_id=user_id,
            status=status,
        )
        db.session.add(project)
        db.session.commit()

        return _ok(data=project.to_dict(), message="项目创建成功", code=201)
    except Exception as e:
        db.session.rollback()
        return _err(str(e), code=500)


# ---- GET /api/projects ----
@projects_bp.route("/", methods=["GET"])
@jwt_required()
def list_projects():
    try:
        user_id = int(get_jwt_identity())
        search = request.args.get("search", "").strip()

        query = Project.query.filter_by(owner_id=user_id)
        if search:
            query = query.filter(Project.name.contains(search))

        projects = query.order_by(Project.updated_at.desc()).all()
        return _ok(data=[p.to_dict() for p in projects])
    except Exception as e:
        return _err(str(e), code=500)


# ---- GET /api/projects/<int:id> ----
@projects_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_project(id):
    try:
        user_id = int(get_jwt_identity())
        project, error = _get_project_or_404(id, user_id)
        if error:
            return error
        return _ok(data=project.to_dict())
    except Exception as e:
        return _err(str(e), code=500)


# ---- PUT /api/projects/<int:id> ----
@projects_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def update_project(id):
    try:
        user_id = int(get_jwt_identity())
        project, error = _get_project_or_404(id, user_id)
        if error:
            return error

        body = request.get_json(silent=True) or {}
        name = body.get("name")
        description = body.get("description")
        status = body.get("status")

        if name is not None:
            name = name.strip()
            if not name:
                return _err("项目名称不能为空")
            if len(name) > 128:
                return _err("项目名称不能超过128个字符")
            project.name = name

        if description is not None:
            project.description = description.strip() or None

        if status is not None:
            status = status.strip()
            if status not in Project.VALID_STATUSES:
                return _err(f"无效的状态值，可选：{', '.join(Project.VALID_STATUSES)}")
            project.status = status

        db.session.commit()
        return _ok(data=project.to_dict(), message="更新成功")
    except Exception as e:
        db.session.rollback()
        return _err(str(e), code=500)


# ---- DELETE /api/projects/<int:id> ----
@projects_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_project(id):
    try:
        user_id = int(get_jwt_identity())
        project, error = _get_project_or_404(id, user_id)
        if error:
            return error

        db.session.delete(project)
        db.session.commit()
        return _ok(data={}, message="项目已删除")
    except Exception as e:
        db.session.rollback()
        return _err(str(e), code=500)
