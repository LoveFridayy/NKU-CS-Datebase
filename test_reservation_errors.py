import requests
import json

BASE_URL = 'http://localhost:5000'

def test_invalid_status_update():
    """测试无效的状态更新"""
    # 尝试将已取消的预订（状态4）更新为其他状态
    reservation_id = 3  # ID为3的预订是已取消状态
    data = {
        'status': 2  # 尝试更新为已确认状态
    }
    
    response = requests.put(
        f'{BASE_URL}/reservations/{reservation_id}/status',
        json=data
    )
    
    print("测试无效状态更新:")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}\n")

def test_invalid_status_code():
    """测试无效的状态码"""
    reservation_id = 1
    data = {
        'status': 5  # 无效的状态码
    }
    
    response = requests.put(
        f'{BASE_URL}/reservations/{reservation_id}/status',
        json=data
    )
    
    print("测试无效状态码:")
    print(f"状态码: {response.status_code}")
    print(f"响应内容: {response.json()}\n")

if __name__ == '__main__':
    print("开始测试存储过程错误处理...\n")
    test_invalid_status_update()
    test_invalid_status_code() 