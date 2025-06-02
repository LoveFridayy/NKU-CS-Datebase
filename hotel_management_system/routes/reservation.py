from flask import Blueprint, jsonify, request
from sqlalchemy import func, and_
from datetime import datetime
from models import db, Reservation, Guest, Room, RoomStatus

# 创建预订管理蓝图
api_bp = Blueprint('reservation', __name__)

# ==============================
# 公共函数 - 数据格式化
# ==============================
def format_reservation(reservation):
    """格式化预订数据，包含关联的房间号和客户姓名"""
    return {
        'id': reservation.id,
        'reservation_number': reservation.reservation_number,
        'guest_id': reservation.guest_id,
        'guest_name': reservation.guest.name,
        'room_id': reservation.room_id,
        'room_number': reservation.room.room_number,
        'room_status': reservation.room.room_status.name,
        'check_in': reservation.check_in.strftime('%Y-%m-%d'),
        'check_out': reservation.check_out.strftime('%Y-%m-%d'),
        'status': reservation.status,
        'status_text': get_reservation_status_text(reservation.status),
        'total_price': float(reservation.total_price),
        'deposit': float(reservation.deposit),
        'created_at': reservation.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'updated_at': reservation.updated_at.strftime('%Y-%m-%d %H:%M:%S')
    }

def get_reservation_status_text(status_code):
    """预订状态码转文本描述"""
    status_map = {
        1: '待确认',
        2: '已确认',
        3: '已入住',
        4: '已取消'
    }
    return status_map.get(status_code, '未知状态')

# ==============================
# 接口：分页查询预订记录（支持多条件过滤）
# ==============================
@api_bp.route('/reservations', methods=['GET'])
def get_reservations():
    # 获取分页和过滤参数
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    room_number = request.args.get('room_number', '').strip()
    status = request.args.get('status', type=int)
    check_in_start = request.args.get('check_in_start')
    check_in_end = request.args.get('check_in_end')

    # 构建基础查询，预加载关联对象
    query = Reservation.query\
        .join(Guest, Reservation.guest_id == Guest.id)\
        .join(Room, Reservation.room_id == Room.id)\
        .join(RoomStatus, Room.room_status_id == RoomStatus.id)\
        .options(
            db.contains_eager(Reservation.guest),
            db.contains_eager(Reservation.room).joinedload(Room.room_status)
        )

    # 应用过滤条件
    if room_number:
        query = query.filter(Room.room_number.ilike(f'%{room_number}%'))
    if status is not None:
        query = query.filter(Reservation.status == status)
    if check_in_start:
        query = query.filter(Reservation.check_in >= check_in_start)
    if check_in_end:
        query = query.filter(Reservation.check_in <= check_in_end)


    # 执行分页查询
    paginated_reservations = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False,
        max_per_page=100
    )

    # 构建响应数据
    result = [format_reservation(res) for res in paginated_reservations.items]

    return jsonify({
        'total': paginated_reservations.total,
        'pages': paginated_reservations.pages,
        'page': paginated_reservations.page,
        'per_page': paginated_reservations.per_page,
        'data': result
    })

# ==============================
# 接口：获取单个预订详情
# ==============================
@api_bp.route('/reservations/<int:reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    # 查询并关联加载相关对象
    reservation = Reservation.query\
        .join(Guest, Reservation.guest_id == Guest.id)\
        .join(Room, Reservation.room_id == Room.id)\
        .join(RoomStatus, Room.room_status_id == RoomStatus.id)\
        .filter(Reservation.id == reservation_id)\
        .options(
            db.contains_eager(Reservation.guest),
            db.contains_eager(Reservation.room).joinedload(Room.room_status)
        )\
        .first_or_404()

    return jsonify(format_reservation(reservation))

# ==============================
# 接口：新增预订
# ==============================
@api_bp.route('/reservations', methods=['POST'])
def create_reservation():
    data = request.get_json()

    # 校验必填字段
    required_fields = [
        'reservation_number', 'guest_id', 'room_id',
        'check_in', 'check_out', 'status',
        'total_price', 'deposit'
    ]
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400

    # 校验日期格式
    try:
        check_in = datetime.strptime(data['check_in'], '%Y-%m-%d')
        check_out = datetime.strptime(data['check_out'], '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': '日期格式错误，正确格式: YYYY-MM-DD'}), 400

    # 检查日期逻辑
    if check_out <= check_in:
        return jsonify({'error': '退房时间必须晚于入住时间'}), 400

    try:
        # 创建新预订
        new_reservation = Reservation(
            reservation_number=data['reservation_number'],
            guest_id=data['guest_id'],
            room_id=data['room_id'],
            check_in=check_in,
            check_out=check_out,
            status=data['status'],
            total_price=data['total_price'],
            deposit=data['deposit'],
        )

        db.session.add(new_reservation)
        db.session.commit()

        return jsonify({
            'message': '预订创建成功',
            'reservation_id': new_reservation.id,
            'data': format_reservation(new_reservation)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '创建预订失败', 'details': str(e)}), 500

# ==============================
# 接口：更新预订信息
# ==============================
@api_bp.route('/reservations/<int:reservation_id>', methods=['PUT'])
def update_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)
    data = request.get_json()

    # 处理日期更新
    if 'check_in' in data:
        try:
            reservation.check_in = datetime.strptime(data['check_in'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': '入住日期格式错误，正确格式: YYYY-MM-DD'}), 400

    if 'check_out' in data:
        try:
            reservation.check_out = datetime.strptime(data['check_out'], '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': '退房日期格式错误，正确格式: YYYY-MM-DD'}), 400

    # 检查日期逻辑
    if 'check_in' in data and 'check_out' in data:
        if reservation.check_out <= reservation.check_in:
            return jsonify({'error': '退房时间必须晚于入住时间'}), 400

    # 更新其他字段（已移除 special_request）
    if 'status' in data:
        reservation.status = data['status']
    if 'total_price' in data:
        reservation.total_price = data['total_price']
    if 'deposit' in data:
        reservation.deposit = data['deposit']

    try:
        db.session.commit()
        return jsonify({
            'message': '预订更新成功',
            'reservation_id': reservation.id,
            'data': format_reservation(reservation)
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '更新预订失败', 'details': str(e)}), 500

# ==============================
# 接口：取消预订（逻辑删除）
# ==============================
@api_bp.route('/reservations/<int:reservation_id>/cancel', methods=['POST'])
def cancel_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)

    # 检查预订状态（已取消的不能重复取消）
    if reservation.status == 4:
        return jsonify({'error': '该预订已取消'}), 400

    try:
        reservation.status = 4  # 设置为已取消
        db.session.commit()

        return jsonify({
            'message': '预订已成功取消',
            'reservation_id': reservation.id,
            'new_status': reservation.status
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '取消预订失败', 'details': str(e)}), 500

# ==============================
# 接口：删除预订（物理删除，谨慎使用）
# ==============================
@api_bp.route('/reservations/<int:reservation_id>', methods=['DELETE'])
def delete_reservation(reservation_id):
    reservation = Reservation.query.get_or_404(reservation_id)

    try:
        db.session.delete(reservation)
        db.session.commit()
        return jsonify({'message': '预订已删除', 'reservation_id': reservation_id})

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '删除预订失败', 'details': str(e)}), 500

# ==============================
# 接口：更新预订状态
# ==============================
@api_bp.route('/reservations/<int:reservation_id>/status', methods=['PUT'])
def update_reservation_status(reservation_id):
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in [1, 2, 3, 4]:
        return jsonify({'error': '无效的预订状态'}), 400

    try:
        # 调用存储过程
        db.session.execute(
            'CALL update_reservation_status(:reservation_id, :new_status)',
            {'reservation_id': reservation_id, 'new_status': new_status}
        )
        db.session.commit()

        # 获取更新后的预订信息
        reservation = Reservation.query.get(reservation_id)
        return jsonify({
            'message': '预订状态更新成功',
            'reservation_id': reservation_id,
            'new_status': new_status,
            'data': format_reservation(reservation)
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '更新预订状态失败', 'details': str(e)}), 500

# ==============================
# 接口：使用视图查询预订详情
# ==============================
@api_bp.route('/reservations/<int:reservation_id>/details', methods=['GET'])
def get_reservation_details(reservation_id):
    try:
        # 调用存储过程获取预订详情
        result = db.session.execute(
            'CALL get_reservation_details(:reservation_id)',
            {'reservation_id': reservation_id}
        )
        
        # 获取结果
        details = result.fetchone()
        
        if not details:
            return jsonify({'error': '预订不存在'}), 404
            
        # 将结果转换为字典
        details_dict = dict(details)
        
        # 格式化日期字段
        if 'check_in' in details_dict:
            details_dict['check_in'] = details_dict['check_in'].strftime('%Y-%m-%d')
        if 'check_out' in details_dict:
            details_dict['check_out'] = details_dict['check_out'].strftime('%Y-%m-%d')
            
        return jsonify({
            'message': '获取预订详情成功',
            'data': details_dict
        })
        
    except Exception as e:
        return jsonify({'error': '获取预订详情失败', 'details': str(e)}), 500