"""任务管理 API 路由"""
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.project import Project
from app.models.task import Task
from app.models.team_member import TeamMember

tasks_bp = Blueprint("tasks", __name__)


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


@tasks_bp.route("/api/projects/<int:project_id>/tasks", methods=["GET", "POST"])
@jwt_required()
def project_tasks(project_id):
    user_id = int(get_jwt_identity())
    proj = Project.query.get(project_id)
    if not proj:
        return _fail("项目不存在", 404)

    current_member = TeamMember.query.filter_by(user_id=user_id, project_id=project_id).first()
    if not current_member:
        return _fail("你不是该项目的成员，无权操作", 403)

    if request.method == "GET":
        tasks = Task.query.filter_by(project_id=project_id).order_by(Task.updated_at.desc()).all()
        return _ok([t.to_dict() for t in tasks])

    elif request.method == "POST":
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        if not title:
            return _fail("任务标题不能为空", 400)
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
        return _ok(task.to_dict(), "任务创建成功", 201)


@tasks_bp.route("/api/tasks/<int:task_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
def task_detail(task_id):
    task = Task.query.get(task_id)
    if not task:
        return _fail("任务不存在", 404)

    if request.method == "GET":
        return _ok(task.to_dict())

    elif request.method == "PUT":
        data = request.get_json(silent=True) or {}
        if "title" in data:
            title = data["title"].strip()
            if not title:
                return _fail("任务标题不能为空", 400)
            task.title = title
        if "description" in data:
            task.description = data["description"].strip()
        if "status" in data:
            if data["status"] not in ("todo", "in_progress", "done"):
                return _fail("无效的任务状态", 400)
            task.status = data["status"]
        if "priority" in data:
            if data["priority"] not in ("low", "medium", "high", "urgent"):
                return _fail("无效的优先级", 400)
            task.priority = data["priority"]
        if "assignee_id" in data:
            task.assignee_id = data["assignee_id"]
        db.session.commit()
        return _ok(task.to_dict(), "任务更新成功")

    elif request.method == "DELETE":
        db.session.delete(task)
        db.session.commit()
        return _ok(None, "任务已删除")


@tasks_bp.route("/api/tasks/<int:task_id>/move", methods=["PUT"])
@jwt_required()
def move_task(task_id):
    """快捷移动任务状态（看板拖拽用）"""
    task = Task.query.get(task_id)
    if not task:
        return _fail("任务不存在", 404)
    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    if new_status not in ("todo", "in_progress", "done"):
        return _fail("无效的任务状态", 400)
    task.status = new_status
    db.session.commit()
    return _ok(task.to_dict(), "任务已移动")
