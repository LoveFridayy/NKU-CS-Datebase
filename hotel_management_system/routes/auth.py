from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity
)
from flask import current_app
from models import db, User

auth_bp = Blueprint('auth', __name__)

# JWT初始化函数
def init_jwt(app):
    from flask_jwt_extended import JWTManager
    jwt = JWTManager(app)
    return jwt

# 注册路由
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'GET':
        return render_template('login-register.html', form_type='register')

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '请输入注册信息'}), 400

        # 验证必填字段
        required_fields = ['username', 'full_name', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} 是必填项'}), 400

        # 检查用户名是否已存在
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': '用户名已存在'}), 400

        # 创建用户
        user = User(
            username=data['username'],
            full_name=data['full_name'],
            email=data.get('email', ''),  # 添加默认值，防止空值
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.commit()

        return jsonify({'message': '注册成功'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'注册失败: {str(e)}'}), 500

# 登录路由
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('login-register.html', form_type='login')

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '请输入账号密码'}), 400

        user = User.query.filter_by(username=data.get('username')).first()

        if not user or not user.verify_password(data.get('password')):
            return jsonify({'error': '账号密码错误'}), 401

        access_token = create_access_token(
            identity=user.username,
            expires_delta=current_app.config['JWT_ACCESS_TOKEN_EXPIRES']
        )

        return jsonify({
           'message': '登录成功',
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name
            }
        }), 200
    except Exception as e:
        return jsonify({'error': f'登录失败: {str(e)}'}), 500