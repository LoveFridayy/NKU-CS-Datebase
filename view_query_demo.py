import mysql.connector
from datetime import datetime
import json
from decimal import Decimal


class DecimalEncoder(json.JSONEncoder):
    """处理Decimal类型的JSON编码器"""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def connect_to_database():
    """连接到数据库"""
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="123456",
        database="hotel_db"
    )


def create_view(cursor):
    """创建预订详情视图"""
    view_sql = """
               CREATE OR REPLACE VIEW reservation_details_view AS
               SELECT r.id          AS reservation_id, \
                      r.reservation_number, \
                      r.check_in, \
                      r.check_out, \
                      r.status      AS reservation_status, \
                      r.total_price, \
                      r.deposit, \
                      g.name        AS guest_name, \
                      g.phone       AS guest_phone, \
                      g.id_number   AS guest_id_number, \
                      rm.room_number, \
                      rm.floor, \
                      rt.name       AS room_type, \
                      rt.base_price, \
                      rs.name       AS room_status, \
                      rs.color_code AS status_color
               FROM reservations r \
                        JOIN guests g ON r.guest_id = g.id \
                        JOIN rooms rm ON r.room_id = rm.id \
                        JOIN room_types rt ON rm.room_type_id = rt.id \
                        JOIN room_status rs ON rm.room_status_id = rs.id; \
               """
    cursor.execute(view_sql)
    print("视图创建成功！")


def query_reservation_details(cursor, reservation_id):
    """查询预订详情"""
    query = """
            SELECT * \
            FROM reservation_details_view
            WHERE reservation_id = %s \
            """
    cursor.execute(query, (reservation_id,))
    result = cursor.fetchone()

    if result:
        # 获取列名
        columns = [desc[0] for desc in cursor.description]
        # 将结果转换为字典
        details = dict(zip(columns, result))

        # 格式化日期字段
        if 'check_in' in details:
            details['check_in'] = details['check_in'].strftime('%Y-%m-%d')
        if 'check_out' in details:
            details['check_out'] = details['check_out'].strftime('%Y-%m-%d')

        return details
    return None


def main():
    try:
        # 连接数据库
        conn = connect_to_database()
        cursor = conn.cursor()

        # 创建视图
        create_view(cursor)

        # 查询预订详情
        reservation_id = 1  # 示例预订ID
        details = query_reservation_details(cursor, reservation_id)

        if details:
            print("\n预订详情：")
            print(json.dumps(details, indent=2, ensure_ascii=False, cls=DecimalEncoder))
        else:
            print(f"\n未找到预订ID为 {reservation_id} 的详情")

    except mysql.connector.Error as err:
        print(f"数据库错误: {err}")
    except Exception as e:
        print(f"发生错误: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    main()