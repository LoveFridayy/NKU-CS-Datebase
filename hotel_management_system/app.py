from flask import Flask, jsonify, render_template
from extension import db
from flask_jwt_extended import JWTManager
from config import Config

# **全局初始化**：直接绑定 app 和 db
app = Flask(__name__)
app.config.from_object(Config)  # 加载配置

# 初始化扩展（此时 app 已配置，db 可直接关联）
db.init_app(app)
jwt = JWTManager(app)

# 导入蓝图（此时 db 已初始化，避免循环依赖）
from routes.auth import auth_bp
from routes.room import api_bp as room_bp
from routes.guest import api_bp as guest_bp
from routes.service import api_bp as service_bp
from routes.reservation import api_bp as reservation_bp
app.register_blueprint(auth_bp)
app.register_blueprint(room_bp)
app.register_blueprint(guest_bp)
app.register_blueprint(service_bp)
app.register_blueprint(reservation_bp)
# 根路由
@app.route('/')
def index():
    return render_template('index.html')

# 错误处理
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "未找到资源"}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({"error": "服务器内部错误"}), 500

# 开发环境自动创建表（生产环境用迁移工具）
if __name__ == '__main__':
    with app.app_context():
        if app.config['DEBUG']:
            db.create_all()
    app.run(debug=app.config['DEBUG'])