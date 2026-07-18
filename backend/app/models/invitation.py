"""Invitation 模型"""
from datetime import datetime, timezone
from app.extensions import db


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
