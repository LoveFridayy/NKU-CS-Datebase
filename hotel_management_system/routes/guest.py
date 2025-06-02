from flask import Blueprint, jsonify, request
from models import db, Guest, Reservation
from sqlalchemy.exc import IntegrityError

api_bp = Blueprint('guest', __name__)


# ==============================
# 公共函数 - 数据格式化
# ==============================
def get_guest_data(guest):
    """统一数据格式化函数，确保接口返回格式一致"""
    return {
        'id': guest.id,
        'name': guest.name,
        'phone': guest.phone,
        'id_number': guest.id_number,
        'email': guest.email,
        'address': guest.address,
        'vip_level': guest.vip_level,
        'total_spent': float(guest.total_spent) if guest.total_spent else 0.0,
        'created_at': guest.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'updated_at': guest.updated_at.strftime('%Y-%m-%d %H:%M:%S')
    }


# ==============================
# 接口：获取所有客户（带分页和过滤）
# ==============================
@api_bp.route('/guests', methods=['GET'])
def get_guests():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    name = request.args.get('name', '').strip()
    phone = request.args.get('phone', '').strip()
    vip_level = request.args.get('vip_level', '')

    # 构建基础查询
    query = Guest.query

    # 应用过滤条件
    if name:
        query = query.filter(Guest.name.ilike(f'%{name}%'))
    if phone:
        query = query.filter(Guest.phone.ilike(f'%{phone}%'))
    if vip_level:
        query = query.filter(Guest.vip_level == vip_level)

    # 执行分页查询
    paginated_guests = query.paginate(page=page, per_page=per_page, error_out=False)

    # 构建响应数据
    result = [get_guest_data(guest) for guest in paginated_guests.items]

    return jsonify({
        'total': paginated_guests.total,
        'pages': paginated_guests.pages,
        'page': paginated_guests.page,
        'per_page': paginated_guests.per_page,
        'data': result
    })


# ==============================
# 接口：获取单个客户详情
# ==============================
@api_bp.route('/guests/<int:guest_id>', methods=['GET'])
def get_guest(guest_id):
    guest = Guest.query.get_or_404(guest_id)
    return jsonify(get_guest_data(guest))


# ==============================
# 接口：新增客户
# ==============================
@api_bp.route('/guests', methods=['POST'])
def add_guest():
    data = request.get_json()
    required_fields = ['name', 'phone', 'id_number', 'vip_level', 'total_spent']  # 必填字段校验

    # 校验必填字段
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400

    # 校验身份证号唯一性
    if Guest.query.filter_by(id_number=data['id_number']).first():
        return jsonify({'error': '身份证号已存在'}), 400

    try:
        new_guest = Guest(
            name=data['name'],
            phone=data['phone'],
            id_number=data['id_number'],
            email=data.get('email', ''),
            address=data.get('address', ''),
            vip_level=int(data['vip_level']),
            total_spent=float(data['total_spent'])
        )

        db.session.add(new_guest)
        db.session.commit()

        return jsonify({
            'message': '客户添加成功',
            'guest_id': new_guest.id,
            'data': get_guest_data(new_guest)
        }), 201

    except ValueError as e:
        return jsonify({
            'error': '参数类型错误',
            'details': f'vip_level需为整数，total_spent需为浮点数：{str(e)}'
        }), 400
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            'error': '数据库操作失败',
            'details': str(e.orig) if hasattr(e, 'orig') else str(e)
        }), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '服务器错误', 'details': str(e)}), 500


# ==============================
# 接口：更新客户信息
# ==============================
@api_bp.route('/guests/<int:guest_id>', methods=['PUT'])
def update_guest(guest_id):
    guest = Guest.query.get_or_404(guest_id)
    data = request.get_json() or {}  # 处理空请求体

    try:
        # 校验身份证号修改（若修改则检查唯一性）
        if 'id_number' in data:
            if data['id_number'] == guest.id_number:
                # 未修改，跳过校验
                pass
            else:
                # 检查新身份证号是否已被其他客户使用
                existing = Guest.query.filter(
                    Guest.id_number == data['id_number'],
                    Guest.id != guest_id
                ).first()
                if existing:
                    return jsonify({'error': '身份证号已被占用'}), 400
                guest.id_number = data['id_number']

        # 更新其他字段
        guest.name = data.get('name', guest.name)
        guest.phone = data.get('phone', guest.phone)
        guest.email = data.get('email', guest.email)
        guest.address = data.get('address', guest.address)
        guest.vip_level = int(data.get('vip_level', guest.vip_level))  # 确保为整数
        guest.total_spent = float(data.get('total_spent', guest.total_spent))  # 确保为浮点数

        db.session.commit()

        return jsonify({
            'message': '客户信息更新成功',
            'guest_id': guest.id,
            'data': get_guest_data(guest)
        })

    except ValueError as e:
        return jsonify({
            'error': '参数类型错误',
            'details': f'vip_level需为整数，total_spent需为浮点数：{str(e)}'
        }), 400
    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            'error': '数据库操作失败',
            'details': str(e.orig) if hasattr(e, 'orig') else str(e)
        }), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '服务器错误', 'details': str(e)}), 500


# ==============================
# 接口：删除客户
# ==============================
@api_bp.route('/guests/<int:guest_id>', methods=['DELETE'])
def delete_guest(guest_id):
    guest = Guest.query.get_or_404(guest_id)

    # 检查是否存在关联的预订记录（状态不限，包括历史记录）
    has_reservations = Reservation.query.filter_by(guest_id=guest_id).first()

    if has_reservations:
        return jsonify({
            'error': '操作失败',
            'message': '该房间存在关联的预订记录，无法直接删除',
            'guest_id': guest_id
        }), 400

    try:
        db.session.delete(guest)
        db.session.commit()
        return jsonify({'message': '客户删除成功', 'guest_id': guest_id})

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            'error': '删除失败，存在其他关联数据',
            'details': str(e.orig) if hasattr(e, 'orig') else str(e)
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '服务器错误', 'details': str(e)}), 500
