"""数据统计 API 路由"""
from datetime import datetime

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models.project import Project
from app.models.task import Task
from app.models.team_member import TeamMember
from app.models.project_file import ProjectFile
from app.models.user import User

stats_bp = Blueprint("stats", __name__)


def _ok(data=None, message="success", code=200):
    return jsonify({
        "code": code, "message": message, "data": data,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


@stats_bp.route("/api/stats", methods=["GET"])
@jwt_required()
def get_stats():
    """获取当前用户相关的统计数据"""
    user_id = int(get_jwt_identity())

    member_rows = TeamMember.query.filter_by(user_id=user_id).all()
    project_ids = [m.project_id for m in member_rows]

    if not project_ids:
        return _ok({
            "overview": {"projects": 0, "tasks": 0, "users": 0, "files": 0, "members": 0},
            "tasks": {"todo": 0, "in_progress": 0, "done": 0},
            "projects_status": {"planning": 0, "active": 0, "completed": 0},
            "priority": {"low": 0, "medium": 0, "high": 0, "urgent": 0},
        })

    total_projects = Project.query.filter(Project.id.in_(project_ids)).count()
    total_tasks = Task.query.filter(Task.project_id.in_(project_ids)).count()
    total_users = User.query.count()
    total_files = ProjectFile.query.filter(ProjectFile.project_id.in_(project_ids)).count()

    todo_count = Task.query.filter(Task.project_id.in_(project_ids), Task.status == "todo").count()
    in_progress_count = Task.query.filter(Task.project_id.in_(project_ids), Task.status == "in_progress").count()
    done_count = Task.query.filter(Task.project_id.in_(project_ids), Task.status == "done").count()

    planning_count = Project.query.filter(Project.id.in_(project_ids), Project.status == "planning").count()
    active_count = Project.query.filter(Project.id.in_(project_ids), Project.status == "active").count()
    completed_count = Project.query.filter(Project.id.in_(project_ids), Project.status == "completed").count()

    total_members = TeamMember.query.filter(TeamMember.project_id.in_(project_ids)).distinct(TeamMember.user_id).count()

    priority_stats = {}
    for p in ["low", "medium", "high", "urgent"]:
        priority_stats[p] = Task.query.filter(Task.project_id.in_(project_ids), Task.priority == p).count()

    return _ok({
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
