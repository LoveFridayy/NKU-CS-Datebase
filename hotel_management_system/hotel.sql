-- 创建酒店数据库
CREATE DATABASE IF NOT EXISTS hotel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_db;

-- 房间类型表
CREATE TABLE room_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '类型名称',
    description TEXT COMMENT '类型描述',
    base_price DECIMAL(10, 2) NOT NULL COMMENT '基础价格',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 房间状态表
CREATE TABLE room_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL COMMENT '状态名称',
    color_code VARCHAR(20) COMMENT '状态显示颜色',
    description TEXT COMMENT '状态描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 房间表
CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_number VARCHAR(10) NOT NULL UNIQUE COMMENT '房间号',
    floor INT NOT NULL COMMENT '楼层',
    room_type_id INT NOT NULL COMMENT '房间类型',
    room_status_id INT NOT NULL DEFAULT 1 COMMENT '房间状态',
    area INT COMMENT '面积(m²)',
    bed_type VARCHAR(20) COMMENT '床型',
    max_guests INT COMMENT '最大入住人数',
    description TEXT COMMENT '房间描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id),
    FOREIGN KEY (room_status_id) REFERENCES room_status(id)
);

-- 客户表
CREATE TABLE guests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '客户姓名',
    phone VARCHAR(20) NOT NULL COMMENT '联系电话',
    id_number VARCHAR(30) NOT NULL UNIQUE COMMENT '身份证号',
    email VARCHAR(50) COMMENT '电子邮箱',
    address VARCHAR(100) COMMENT '联系地址',
    vip_level INT DEFAULT 0 COMMENT 'VIP等级',
    total_spent DECIMAL(10, 2) DEFAULT 0 COMMENT '累计消费',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 服务类型表
CREATE TABLE service_type (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '类型名称',
    description TEXT COMMENT '类型描述',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_name (name)  -- 确保类型名称唯一
);

-- 服务表
CREATE TABLE service (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL COMMENT '服务名称',
    price DECIMAL(10, 2) NOT NULL COMMENT '服务价格',
    description TEXT COMMENT '服务描述',
    type_id INT DEFAULT NULL COMMENT '服务类型ID',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES service_type(id) ON DELETE SET NULL
);

-- 预订表（简化版，合并核心信息）
CREATE TABLE reservations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reservation_number VARCHAR(20) NOT NULL UNIQUE COMMENT '预订编号',
    guest_id INT NOT NULL COMMENT '客户ID',
    room_id INT NOT NULL COMMENT '房间ID',
    check_in DATE NOT NULL COMMENT '入住日期',
    check_out DATE NOT NULL COMMENT '退房日期',
    status INT NOT NULL DEFAULT 1 COMMENT '预订状态（1=待确认，2=已确认，3=已入住，4=已取消）',
    total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.0 COMMENT '总价',
    deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.0 COMMENT '押金',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
) COMMENT '预订信息表';

-- 用户表（用于系统登录）
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(256) NOT NULL COMMENT '密码哈希',
    full_name VARCHAR(50) NOT NULL COMMENT '姓名',
    email VARCHAR(50) COMMENT '电子邮箱',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 创建预订日志表
CREATE TABLE reservation_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reservation_id INT NOT NULL,
    reservation_number VARCHAR(20) NOT NULL,
    guest_id INT NOT NULL,
    room_id INT NOT NULL,
    action VARCHAR(10) NOT NULL,
    action_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guest_id) REFERENCES guests(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
) COMMENT '预订操作日志表';

-- 创建预订删除前的触发器
DELIMITER //
CREATE TRIGGER before_reservation_delete
BEFORE DELETE ON reservations
FOR EACH ROW
BEGIN
    -- 检查预订状态是否为已取消
    IF OLD.status != 4 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '只能删除已取消的预订';
    END IF;
    
    -- 记录删除的预订信息到日志表
    INSERT INTO reservation_logs (
        reservation_id,
        reservation_number,
        guest_id,
        room_id,
        action,
        action_time
    ) VALUES (
        OLD.id,
        OLD.reservation_number,
        OLD.guest_id,
        OLD.room_id,
        'DELETE',
        NOW()
    );
END //
DELIMITER ;

-- 创建预订添加前的触发器
DELIMITER //
CREATE TRIGGER before_reservation_insert
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    DECLARE room_status INT;
    DECLARE existing_reservation INT;
    
    -- 检查房间状态
    SELECT room_status_id INTO room_status 
    FROM rooms 
    WHERE id = NEW.room_id;
    
    IF room_status != 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '房间当前不可预订';
    END IF;
    
    -- 检查时间冲突
    SELECT COUNT(*) INTO existing_reservation
    FROM reservations
    WHERE room_id = NEW.room_id
    AND status != 4  -- 排除已取消的预订
    AND (
        (NEW.check_in < check_out AND NEW.check_out > check_in)
    );
    
    IF existing_reservation > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '该时间段房间已被预订';
    END IF;
    
    -- 记录操作日志
    INSERT INTO reservation_logs (
        reservation_id,
        reservation_number,
        guest_id,
        room_id,
        action,
        action_time
    ) VALUES (
        NEW.id,
        NEW.reservation_number,
        NEW.guest_id,
        NEW.room_id,
        'INSERT',
        NOW()
    );
END //
DELIMITER ;

-- 初始化基础数据
-- 房间状态
INSERT INTO room_status (name, color_code, description) VALUES
('可用', '#22c55e', '房间当前可预订'),
('已入住', '#ef4444', '房间当前已被占用'),
('已预订', '#3b82f6', '房间已被预订'),
('维护中', '#f59e0b', '房间正在维护，不可预订');

-- 插入房间类型数据
INSERT INTO room_types (name, description, base_price) VALUES
('标准单人间', '舒适单人床，独立卫浴，免费WiFi', 299.00),
('标准双人间', '两张单人床，独立卫浴，免费WiFi', 399.00),
('豪华单人间', '豪华大床，行政待遇，免费早餐', 499.00),
('豪华双人间', '两张豪华单人床，行政待遇，免费早餐', 599.00),
('商务套房', '独立卧室和客厅，商务设施齐全', 799.00),
('总统套房', '全套豪华设施，专属管家服务', 1999.00);

-- 插入房间数据（1-3层共30间房）
INSERT INTO rooms (room_number, floor, room_type_id, room_status_id, area, bed_type, max_guests, description) VALUES
('101', 1, 1, 1, 25, '单人床', 1, '面朝花园，安静舒适'),
('102', 1, 1, 1, 25, '单人床', 1, '采光良好，视野开阔'),
('103', 1, 2, 1, 30, '双人床', 2, '空间宽敞，设施齐全'),
('104', 1, 2, 2, 30, '双人床', 2, '安静角落，适合家庭'),
('105', 1, 3, 1, 35, '大床', 1, '行政楼层，专属服务'),
('201', 2, 1, 1, 25, '单人床', 1, '视野开阔，安静舒适'),
('202', 2, 2, 3, 30, '双人床', 2, '新装修，设施现代'),
('203', 2, 3, 1, 35, '大床', 1, '配备迷你吧台'),
('204', 2, 4, 1, 40, '双床', 2, '行政待遇，免费早餐'),
('205', 2, 5, 4, 60, '大床', 2, '独立客厅，商务办公'),
('301', 3, 3, 1, 35, '大床', 1, '豪华装修，视野极佳'),
('302', 3, 4, 1, 40, '双床', 2, '行政楼层，安静私密'),
('303', 3, 5, 1, 60, '大床', 2, '商务设施齐全'),
('304', 3, 6, 1, 120, '特大床', 4, '总统级享受，全套设施'),
('305', 3, 6, 1, 120, '特大床', 4, '专属管家服务');

-- 插入客户数据
INSERT INTO guests (name, phone, id_number, email, address, vip_level, total_spent) VALUES
('张三', '13800138001', '110101199001011234', 'zhangsan@example.com', '北京市朝阳区', 1, 1500.00),
('李四', '13900139002', '310101199102025678', 'lisi@example.com', '上海市浦东新区', 2, 3200.00),
('王五', '13700137003', '440101199203039012', 'wangwu@example.com', '广州市天河区', 0, 800.00),
('赵六', '13600136004', '420101199304043456', 'zhaoliu@example.com', '武汉市武昌区', 3, 8500.00),
('钱七', '13500135005', '330101199405057890', 'qianqi@example.com', '杭州市西湖区', 1, 1200.00),
('孙八', '13400134006', '120101199506061234', 'sunba@example.com', '天津市南开区', 0, 500.00),
('周九', '13300133007', '510101199607075678', 'zhoujiu@example.com', '成都市锦江区', 2, 4200.00),
('吴十', '13200132008', '320101199708089012', 'wushi@example.com', '南京市鼓楼区', 0, 300.00);

INSERT INTO service_type (name, description) VALUES
('基础服务', '客房日常维护和清洁服务'),
('餐饮服务', '食品和饮料相关服务'),
('娱乐休闲', '休闲娱乐设施和活动'),
('商务服务', '商务中心和会议设施'),
('接送服务', '机场/车站接送服务');

INSERT INTO service (name, price, description, type_id) VALUES
('客房清洁', 50.00, '每日一次的标准客房清洁服务', 1),
('更换床单', 30.00, '按需更换床单被套服务', 1),
('早餐服务', 88.00, '双人份自助早餐', 2),
('午餐套餐', 128.00, '双人份午餐套餐', 2),
('晚餐服务', 168.00, '双人份晚餐套餐', 2),
('迷你吧补充', 50.00, '每日补充迷你吧饮品', 2),
('健身房使用', 0.00, '24小时健身房免费使用', 3),
('游泳池使用', 0.00, '全天候游泳池免费使用', 3),
('SPA按摩', 388.00, '60分钟全身按摩服务', 3),
('会议室租赁', 500.00, '小型会议室2小时租赁', 4),
('打印复印', 2.00, '黑白打印/复印服务（每页）', 4),
('机场接送', 150.00, '单程机场接送服务', 5),
('火车站接送', 100.00, '单程火车站接送服务', 5);

-- 插入5条预订记录（关联已有客户和房间数据）
INSERT INTO reservations (
    reservation_number,
    guest_id,
    room_id,
    check_in,
    check_out,
    status,
    total_price,
    deposit
) VALUES
-- 张三预订101房间（标准单人间，基础价299元/天，入住2天）
('R20251001', 1, 1, '2025-06-01', '2025-06-03', 2, 598.00, 500.00),
-- 李四预订103房间（标准双人间，基础价399元/天，入住3天）
('R20251002', 2, 3, '2025-06-05', '2025-06-08', 2, 1197.00, 1000.00),
-- 王五预订201房间（标准单人间，入住1天，已取消）
('R20251003', 3, 6, '2025-06-10', '2025-06-11', 4, 299.00, 300.00),
-- 赵六预订304房间（总统套房，基础价1999元/天，入住2天）
('R20251004', 4, 14, '2025-06-11', '2025-06-13', 1, 3998.00, 2000.00),
-- 钱七预订203房间（豪华单人间，基础价499元/天，入住1天）
('R20251005', 5, 8, '2025-06-01', '2025-06-02', 2, 499.00, 500.00);

-- 创建存储过程
DELIMITER //
CREATE PROCEDURE update_reservation_status(
    IN p_reservation_id INT,
    IN p_new_status INT
)
BEGIN
    DECLARE current_status INT;
    DECLARE room_id INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '更新预订状态失败';
    END;

    START TRANSACTION;

    -- 获取当前预订状态和房间ID
    SELECT status, room_id INTO current_status, room_id
    FROM reservations
    WHERE id = p_reservation_id;

    -- 验证状态变更的合法性
    IF current_status = 4 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '已取消的预订不能更改状态';
    END IF;

    -- 更新预订状态
    UPDATE reservations
    SET status = p_new_status,
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- 根据新状态更新房间状态
    CASE p_new_status
        WHEN 2 THEN -- 已确认
            UPDATE rooms
            SET room_status_id = 3, -- 已预订
                updated_at = NOW()
            WHERE id = room_id;
        WHEN 3 THEN -- 已入住
            UPDATE rooms
            SET room_status_id = 2, -- 已入住
                updated_at = NOW()
            WHERE id = room_id;
        WHEN 4 THEN -- 已取消
            UPDATE rooms
            SET room_status_id = 1, -- 可用
                updated_at = NOW()
            WHERE id = room_id;
    END CASE;

    -- 记录状态变更日志
    INSERT INTO reservation_logs (
        reservation_id,
        reservation_number,
        guest_id,
        room_id,
        action,
        action_time
    )
    SELECT 
        id,
        reservation_number,
        guest_id,
        room_id,
        CONCAT('STATUS_CHANGE_', p_new_status),
        NOW()
    FROM reservations
    WHERE id = p_reservation_id;

    COMMIT;
END //
DELIMITER ;

-- 检查预订状态
SELECT * FROM reservations WHERE id = 1;

-- 检查房间状态
SELECT r.*, rs.name as status_name 
FROM rooms r 
JOIN room_status rs ON r.room_status_id = rs.id 
WHERE r.id = (SELECT room_id FROM reservations WHERE id = 1);

-- 检查操作日志
SELECT * FROM reservation_logs 
WHERE reservation_id = 1 
ORDER BY action_time DESC;

-- 创建预订详情视图
CREATE OR REPLACE VIEW reservation_details_view AS
SELECT 
    r.id AS reservation_id,
    r.reservation_number,
    r.check_in,
    r.check_out,
    r.status AS reservation_status,
    r.total_price,
    r.deposit,
    g.name AS guest_name,
    g.phone AS guest_phone,
    g.id_number AS guest_id_number,
    rm.room_number,
    rm.floor,
    rt.name AS room_type,
    rt.base_price,
    rs.name AS room_status,
    rs.color_code AS status_color
FROM 
    reservations r
    JOIN guests g ON r.guest_id = g.id
    JOIN rooms rm ON r.room_id = rm.id
    JOIN room_types rt ON rm.room_type_id = rt.id
    JOIN room_status rs ON rm.room_status_id = rs.id;

-- 创建查询预订详情的存储过程
DELIMITER //
CREATE PROCEDURE get_reservation_details(
    IN p_reservation_id INT
)
BEGIN
    SELECT * FROM reservation_details_view
    WHERE reservation_id = p_reservation_id;
END //
DELIMITER ;