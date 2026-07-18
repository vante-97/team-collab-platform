"""团队协作 API 路由"""
from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.user import User
from app.models.project import Project
from app.models.team_member import TeamMember
from app.models.invitation import Invitation

members_bp = Blueprint("members", __name__)


def _ok(data=None, message="success", code=200):
    return jsonify({"code": code, "message": message, "data": data,
                    "timestamp": datetime.utcnow().isoformat() + "Z"})


def _fail(message, code=400):
    return jsonify({"code": code, "message": message, "data": None,
                    "timestamp": datetime.utcnow().isoformat() + "Z"})




# ---- 用户列表 ----
@members_bp.route("/api/users", methods=["GET"])
@jwt_required()
def get_users():
    users = User.query.all()
    return _ok([u.to_dict() for u in users])


# ---- 项目成员 ----
@members_bp.route("/api/projects/<int:project_id>/members", methods=["GET", "POST"])
@jwt_required()
def project_members(project_id):
    user_id = int(get_jwt_identity())
    proj = Project.query.get(project_id)

    if not proj:
        return _fail("项目不存在", 404)


    if request.method == "GET":
        members = TeamMember.query.filter_by(project_id=project_id).all()
        return _ok([m.to_dict() for m in members])

    elif request.method == "POST":
        current_member = TeamMember.query.filter_by(user_id=user_id, project_id=project_id).first()
        if not current_member or current_member.role not in ("owner", "admin"):
            return _fail("你没有权限添加成员", 403)

        data = request.get_json(silent=True) or {}
        invitee_username = data.get("username", "").strip()
        role = data.get("role", "member")

        if not invitee_username:
            return _fail("请输入用户名", 400)
        if role not in ("admin", "member", "viewer"):
            return _fail("无效的角色", 400)

        invitee = User.query.filter_by(username=invitee_username).first()
        if not invitee:
            return _fail("用户不存在", 404)
        if invitee.id == user_id:
            return _fail("不能邀请自己", 400)

        existing = TeamMember.query.filter_by(user_id=invitee.id, project_id=project_id).first()
        if existing:
            return _fail("该用户已是项目成员", 400)

        pending = Invitation.query.filter_by(
            project_id=project_id, invitee_id=invitee.id, status="pending"
        ).first()
        if pending:
            return _fail("已向该用户发送过邀请，请等待对方处理", 400)

        inv = Invitation(
            project_id=project_id,
            inviter_id=user_id,
            invitee_id=invitee.id,
            role=role,
        )
        db.session.add(inv)
        db.session.commit()
        return _ok(inv.to_dict(), "邀请已发送", 201)


# ---- 成员管理 ----
@members_bp.route("/api/members/<int:member_id>", methods=["PUT", "DELETE"])
@jwt_required()
def member_detail(member_id):
    user_id = int(get_jwt_identity())
    member = TeamMember.query.get(member_id)
    if not member:
        return _fail("成员不存在", 404)

    current_member = TeamMember.query.filter_by(user_id=user_id, project_id=member.project_id).first()
    if not current_member or current_member.role not in ("owner", "admin"):
        return _fail("你没有权限执行此操作", 403)

    if request.method == "PUT":
        data = request.get_json(silent=True) or {}
        role = data.get("role")
        if role not in ("admin", "member", "viewer"):
            return _fail("无效的角色", 400)
        member.role = role
        db.session.commit()
        return _ok(member.to_dict(), "角色已更新")

    elif request.method == "DELETE":
        db.session.delete(member)
        db.session.commit()
        return _ok(None, "成员已移除")


# ---- 邀请 API ----
@members_bp.route("/api/invitations", methods=["GET"])
@jwt_required()
def get_invitations():
    user_id = int(get_jwt_identity())
    received = Invitation.query.filter_by(invitee_id=user_id).order_by(Invitation.created_at.desc()).all()
    sent = Invitation.query.filter_by(inviter_id=user_id).order_by(Invitation.created_at.desc()).all()
    return _ok({
        "received": [i.to_dict() for i in received],
        "sent": [i.to_dict() for i in sent],
    })


@members_bp.route("/api/invitations/<int:invitation_id>/respond", methods=["PUT"])
@jwt_required()
def respond_invitation(invitation_id):
    user_id = int(get_jwt_identity())
    inv = Invitation.query.get(invitation_id)
    if not inv:
        return _fail("邀请不存在", 404)
    if inv.invitee_id != user_id:
        return _fail("该邀请不是发给你的", 403)
    if inv.status != "pending":
        return _fail("该邀请已被处理", 400)

    data = request.get_json(silent=True) or {}
    action = data.get("action", "").strip()
    if action not in ("accept", "reject"):
        return _fail("请选择 accept 或 reject", 400)

    if action == "reject":
        inv.status = "rejected"
        db.session.commit()
        return _ok(inv.to_dict(), "已拒绝邀请")

    existing = TeamMember.query.filter_by(user_id=user_id, project_id=inv.project_id).first()
    if existing:
        return _fail("你已经是该项目的成员", 400)

    membership = TeamMember(user_id=user_id, project_id=inv.project_id, role=inv.role)
    inv.status = "accepted"
    db.session.add(membership)
    db.session.commit()
    return _ok({"member": membership.to_dict(), "invitation": inv.to_dict()}, "已加入项目")


@members_bp.route("/api/invitations/unread-count", methods=["GET"])
@jwt_required()
def unread_invitation_count():
    user_id = int(get_jwt_identity())
    count = Invitation.query.filter_by(invitee_id=user_id, status="pending").count()
    return _ok({"count": count})
