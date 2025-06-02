from flask import Blueprint, jsonify, request
from models import db, Service, ServiceType
from sqlalchemy.exc import IntegrityError

api_bp = Blueprint('service', __name__)

# ==============================
# 公共函数 - 数据格式化
# ==============================
def get_service_data(service):
    """格式化服务数据"""
    return {
        'id': service.id,
        'name': service.name,
        'price': float(service.price),
        'description': service.description,
        'type_id': service.type_id,
        'type_name': service.type.name if service.type else None,
        'created_at': service.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'updated_at': service.updated_at.strftime('%Y-%m-%d %H:%M:%S')
    }

# ==============================
# 服务接口
# ==============================
@api_bp.route('/services', methods=['GET'])
def get_services():
    """获取所有服务（带分页、服务名称和服务类型过滤）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    name = request.args.get('name', '').strip()
    type_id = request.args.get('type_id', type=int)  # 新增：服务类型ID过滤

    query = Service.query

    if name:
        query = query.filter(Service.name.ilike(f'%{name}%'))
    if type_id is not None:
        query = query.filter(Service.type_id == type_id)

    # 添加服务类型的JOIN（仅在需要时）
    if type_id is not None:
        query = query.join(ServiceType, Service.type_id == ServiceType.id, isouter=True)

    paginated_services = query.paginate(page=page, per_page=per_page, error_out=False)
    result = [get_service_data(s) for s in paginated_services.items]

    return jsonify({
        'total': paginated_services.total,
        'pages': paginated_services.pages,
        'page': paginated_services.page,
        'per_page': paginated_services.per_page,
        'data': result
    })

@api_bp.route('/services/<int:service_id>', methods=['GET'])
def get_service(service_id):
    """获取单个服务详情"""
    service = Service.query.get_or_404(service_id)
    return jsonify(get_service_data(service))

@api_bp.route('/services', methods=['POST'])
def add_service():
    """新增服务"""
    data = request.get_json()
    required_fields = ['name', 'price']

    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必填字段: {field}'}), 400

    # 验证服务类型是否存在（如果提供了type_id）
    if 'type_id' in data and data['type_id'] is not None:
        service_type = ServiceType.query.get(data['type_id'])
        if not service_type:
            return jsonify({'error': f'无效的服务类型ID: {data["type_id"]}'}), 400

    try:
        new_service = Service(
            name=data['name'],
            price=float(data['price']),
            description=data.get('description', ''),
            type_id=data.get('type_id')
        )

        db.session.add(new_service)
        db.session.commit()

        return jsonify({
            'message': '服务添加成功',
            'service_id': new_service.id,
            'data': get_service_data(new_service)
        }), 201

    except ValueError as e:
        return jsonify({
            'error': '参数类型错误',
            'details': f'price需为数字：{str(e)}'
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

@api_bp.route('/services/<int:service_id>', methods=['PUT'])
def update_service(service_id):
    """更新服务信息"""
    service = Service.query.get_or_404(service_id)
    data = request.get_json() or {}

    try:
        if 'name' in data:
            service.name = data['name']
        if 'price' in data:
            service.price = float(data['price'])
        if 'description' in data:
            service.description = data['description']
        if 'type_id' in data:
            if data['type_id'] is None:
                service.type_id = None
            else:
                service_type = ServiceType.query.get(data['type_id'])
                if not service_type:
                    return jsonify({'error': f'无效的服务类型ID: {data["type_id"]}'}), 400
                service.type_id = data['type_id']

        db.session.commit()

        return jsonify({
            'message': '服务更新成功',
            'service_id': service.id,
            'data': get_service_data(service)
        })

    except ValueError as e:
        return jsonify({
            'error': '参数类型错误',
            'details': f'price需为数字：{str(e)}'
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

@api_bp.route('/services/<int:service_id>', methods=['DELETE'])
def delete_service(service_id):
    """删除服务"""
    service = Service.query.get_or_404(service_id)

    try:
        db.session.delete(service)
        db.session.commit()
        return jsonify({'message': '服务删除成功', 'service_id': service_id})

    except IntegrityError as e:
        db.session.rollback()
        return jsonify({
            'error': '删除失败，存在关联数据',
            'details': str(e.orig) if hasattr(e, 'orig') else str(e)
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': '服务器错误', 'details': str(e)}), 500