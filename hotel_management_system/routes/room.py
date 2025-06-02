from flask import Blueprint, jsonify, request
from models import db, Room, RoomType, RoomStatus, Reservation  # 引入关联模型
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

api_bp = Blueprint('room', __name__)


# ==============================
# 公共函数 - 数据格式化
# ==============================
def get_room_data(room):
    """统一数据格式化函数，确保接口返回格式一致"""
    return {
        'id': room.id,
        'room_number': room.room_number,
        'floor': room.floor,
        'room_type': {
            'id': room.room_type.id,
            'name': room.room_type.name,
            'base_price': float(room.room_type.base_price)
        } if room.room_type else None,
        'area': room.area,
        'bed_type': room.bed_type,
        'max_guests': room.max_guests,
        'room_status': {
            'id': room.room_status.id,
            'name': room.room_status.name,
            'color_code': room.room_status.color_code
        } if room.room_status else None,
        'description': room.description,
        'created_at': room.created_at.strftime('%Y-%m-%d %H:%M:%S') if room.created_at else None,
        'updated_at': room.updated_at.strftime('%Y-%m-%d %H:%M:%S') if room.updated_at else None
    }


# ==============================
# 接口：获取所有房间（带分页和过滤）
# ==============================
@api_bp.route('/rooms', methods=['GET'])
def get_rooms():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '').strip()
    room_type_id = request.args.get('type', type=int)
    room_status_id = request.args.get('status', type=int)

    # 构建基础查询（预加载关联数据）
    query = Room.query.options(
        joinedload(Room.room_type),
        joinedload(Room.room_status)
    )

    # 应用过滤条件
    if search:
        query = query.filter(Room.room_number.ilike(f'%{search}%'))
    if room_type_id:
        query = query.filter(Room.room_type_id == room_type_id)
    if room_status_id:
        query = query.filter(Room.room_status_id == room_status_id)

    # 添加排序（升序）
    query = query.order_by(Room.room_number.asc())
    # 执行分页查询
    paginated_rooms = query.paginate(page=page, per_page=per_page, error_out=False)

    # 构建响应数据
    result = [get_room_data(room) for room in paginated_rooms.items]

    return jsonify({
        'total': paginated_rooms.total,
        'pages': paginated_rooms.pages,
        'page': paginated_rooms.page,
        'per_page': paginated_rooms.per_page,
        'data': result
    })


# ==============================
# 接口：获取单个房间详情
# ==============================
@api_bp.route('/rooms/<int:room_id>', methods=['GET'])
def get_room(room_id):
    room = Room.query.options(
        joinedload(Room.room_type),
        joinedload(Room.room_status)
    ).get_or_404(room_id)
    return jsonify(get_room_data(room))


# ==============================
# 接口：新增房间
# ==============================
@api_bp.route('/rooms', methods=['POST'])
def add_room():
    data = request.get_json()
    required_fields = ['room_number', 'floor', 'room_type_id']  # 必填字段校验

    # 校验必填字段
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400

    # 校验房间号唯一性
    if Room.query.filter_by(room_number=data['room_number']).first():
        return jsonify({'error': '房间号已存在'}), 400

    try:
        new_room = Room(
            room_number=data['room_number'],
            floor=data['floor'],
            room_type_id=data['room_type_id'],
            area=data.get('area'),
            bed_type=data.get('bed_type'),
            max_guests=data.get('max_guests', 2),  # 设置默认值
            room_status_id=data.get('room_status_id', 1),  # 默认状态为可用（1）
            description=data.get('description', '')
        )

        db.session.add(new_room)
        db.session.commit()

        return jsonify({
            'message': '房间添加成功',
            'room_id': new_room.id,
            'data': get_room_data(new_room)
        }), 201

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
# 接口：更新房间信息
# ==============================
@api_bp.route('/rooms/<int:room_id>', methods=['PUT'])
def update_room(room_id):
    room = Room.query.get_or_404(room_id)
    data = request.get_json() or {}  # 处理空请求体

    try:
        # 校验房间号是否重复（若修改了房间号）
        if 'room_number' in data and data['room_number'] != room.room_number:
            if Room.query.filter(Room.room_number == data['room_number']).first():
                return jsonify({'error': '新房间号已存在'}), 400

        # 更新字段
        room.room_number = data.get('room_number', room.room_number)
        room.floor = data.get('floor', room.floor)
        room.room_type_id = data.get('room_type_id', room.room_type_id)
        room.area = data.get('area', room.area)
        room.bed_type = data.get('bed_type', room.bed_type)
        room.max_guests = data.get('max_guests', room.max_guests)
        room.room_status_id = data.get('room_status_id', room.room_status_id)
        room.description = data.get('description', room.description)

        db.session.commit()

        return jsonify({
            'message': '房间更新成功',
            'room_id': room.id,
            'data': get_room_data(room)
        })

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
# 接口：删除房间
# ==============================
@api_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    room = Room.query.get_or_404(room_id)

    # 检查是否存在关联的预订记录（状态不限，包括历史记录）
    has_reservations = Reservation.query.filter_by(room_id=room_id).first()

    if has_reservations:
        return jsonify({
            'error': '操作失败',
            'message': '该房间存在关联的预订记录，无法直接删除',
            'room_id': room_id
        }), 400

    try:
        db.session.delete(room)
        db.session.commit()
        return jsonify({'message': '房间删除成功', 'room_id': room_id})

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            'error': '删除失败，存在其他关联数据',
            'details': str(e.orig) if hasattr(e, 'orig') else str(e)
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '服务器错误', 'details': str(e)}), 500
