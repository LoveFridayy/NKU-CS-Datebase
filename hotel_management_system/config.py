# config.py
import os
from datetime import timedelta


class Config:
    # 从环境变量获取配置，默认使用开发环境
    DEBUG = os.environ.get('FLASK_DEBUG', False)
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY', 'hotel-management-secret-key')

    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:123456@localhost:3306/hotel_db?charset=utf8mb4'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = DEBUG  # 仅在调试模式下打印SQL

    # JWT配置
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)