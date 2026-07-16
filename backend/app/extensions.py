"""Flask 扩展实例"""
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()

# Token 黑名单（生产环境改用 Redis）
TOKEN_BLACKLIST: set = set()
