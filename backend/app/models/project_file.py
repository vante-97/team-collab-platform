"""ProjectFile 模型"""
from datetime import datetime, timezone
from app.extensions import db


class ProjectFile(db.Model):
    __tablename__ = "project_files"
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(500), nullable=False)
    original_name = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, default=0)
    file_type = db.Column(db.String(50), default="")
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
