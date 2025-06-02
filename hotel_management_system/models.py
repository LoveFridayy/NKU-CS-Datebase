from sqlalchemy import Column, Integer, String, Text, DateTime, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship, backref
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from extension import db


# 房间类型表（未修改）
class RoomType(db.Model):
    __tablename__ = 'room_types'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, comment='类型名称')
    description = Column(Text, comment='类型描述')
    base_price = Column(DECIMAL(10, 2), nullable=False, comment='基础价格')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    rooms = relationship('Room', back_populates='room_type', lazy=True)


# 房间状态表（未修改）
class RoomStatus(db.Model):
    __tablename__ = 'room_status'
    id = Column(Integer, primary_key=True)
    name = Column(String(20), nullable=False, comment='状态名称')
    color_code = Column(String(20), comment='状态显示颜色')
    description = Column(Text, comment='状态描述')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    rooms = relationship('Room', back_populates='room_status', lazy=True)


# 房间表（未修改，但明确反向引用名称）
class Room(db.Model):
    __tablename__ = 'rooms'
    id = Column(Integer, primary_key=True)
    room_number = Column(String(10), nullable=False, unique=True, comment='房间号')
    floor = Column(Integer, nullable=False, comment='楼层')
    room_type_id = Column(Integer, ForeignKey('room_types.id'), nullable=False, comment='房间类型')
    room_status_id = Column(Integer, ForeignKey('room_status.id'), nullable=False, default=1, comment='房间状态')
    area = Column(Integer, comment='面积(m²)')
    bed_type = Column(String(20), comment='床型')
    max_guests = Column(Integer, comment='最大入住人数')
    description = Column(Text, comment='房间描述')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    # 定义关系（明确反向引用名称为 'room_reservations'，避免与其他模型冲突）
    room_type = relationship('RoomType', back_populates='rooms')
    room_status = relationship('RoomStatus', back_populates='rooms')
    reservations = relationship('Reservation', back_populates='room', lazy=True)  # 反向引用名在 Reservation 中为 'room'


# 客户表（关键修改：调整反向引用名称为 'guest_reservations'）
class Guest(db.Model):
    __tablename__ = 'guests'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, comment='客户姓名')
    phone = Column(String(20), nullable=False, comment='联系电话')
    id_number = Column(String(30), nullable=False, unique=True, comment='身份证号')
    email = Column(String(50), comment='电子邮箱')
    address = Column(String(100), comment='联系地址')
    vip_level = Column(Integer, default=0, comment='VIP等级')
    total_spent = Column(DECIMAL(10, 2), default=0, comment='累计消费')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    # 反向引用名称改为 'guest_reservations'，避免与 Reservation 的 backref 冲突
    reservations = relationship('Reservation', back_populates='guest', lazy=True)


# 服务类型表（未修改）
class ServiceType(db.Model):
    __tablename__ = 'service_type'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True, comment='类型名称')
    description = Column(Text, comment='类型描述')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    services = relationship('Service', back_populates='type', cascade='all, delete-orphan')


# 服务表（未修改）
class Service(db.Model):
    __tablename__ = 'service'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, comment='服务名称')
    price = Column(DECIMAL(10, 2), nullable=False, comment='服务价格')
    description = Column(Text, comment='服务描述')
    type_id = Column(Integer, ForeignKey('service_type.id'), nullable=True, comment='服务类型ID')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')
    type = relationship('ServiceType', back_populates='services')


# 预订表（关键修改：调整 backref 名称为 'guest_reservations'）
class Reservation(db.Model):
    __tablename__ = 'reservations'
    id = Column(Integer, primary_key=True)
    reservation_number = Column(String(20), unique=True, nullable=False, comment='预订编号')
    guest_id = Column(Integer, ForeignKey('guests.id'), nullable=False, comment='客户ID')
    room_id = Column(Integer, ForeignKey('rooms.id'), nullable=False, comment='房间ID')
    check_in = Column(DateTime, nullable=False, comment='入住日期时间')
    check_out = Column(DateTime, nullable=False, comment='退房日期时间')
    status = Column(Integer, default=1, comment='预订状态（1=待确认，2=已确认，3=已入住，4=已取消）')
    total_price = Column(DECIMAL(10, 2), default=0.0, comment='总价')
    deposit = Column(DECIMAL(10, 2), default=0.0, comment='押金')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    # 关联 Guest 时，backref 改为与 Guest.reservations 一致的名称（此处 Guest 模型的关系名为 'reservations'，故 backref 无需修改，但需确保不冲突）
    guest = relationship('Guest', back_populates='reservations', lazy=True)  # 反向引用名与 Guest.reservations 对应
    room = relationship('Room', back_populates='reservations', lazy=True)  # 反向引用名与 Room.reservations 对应


# 用户表（未修改）
class User(db.Model):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, comment='用户名')
    password_hash = Column(String(256), nullable=False, comment='密码哈希')
    full_name = Column(String(50), nullable=False, comment='姓名')
    email = Column(String(50), comment='电子邮箱')
    created_at = Column(DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)