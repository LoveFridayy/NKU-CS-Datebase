let currentReservationPage = 1;
const itemsPerReservationPage = 10; // 每页显示条数
let totalReservationItems = 0;
let totalReservationPages = 1;
// 操作模式变量
let currentReservationOperation = 'add'; // 'add' | 'edit' | 'view'
let currentReservationId = null; // 当前编辑的预订ID

// 初始化模态框
const reservationModal = document.getElementById('reservation-modal');
const reservationModalContent = document.getElementById('reservation-modal-content');
const addReservationBtn = document.getElementById('add-reservation-btn');
const closeReservationModalBtn = document.getElementById('close-reservation-modal');
const cancelAddReservationBtn = document.getElementById('cancel-reservation-btn');
const reservationForm = document.getElementById('reservation-form');

// 打开模态框时重置表单
function openReservationModal() {
    reservationForm.reset();
    reservationModal.classList.remove('hidden');
    reservationModal.classList.add('flex');
    setTimeout(() => reservationModalContent.classList.remove('scale-95', 'opacity-0'), 10);
}

// 关闭模态框
function closeReservationModal() {
    reservationModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        reservationModal.classList.remove('flex');
        reservationModal.classList.add('hidden');
    }, 300);
}

// 绑定模态框事件
addReservationBtn.addEventListener('click', addReservation);
closeReservationModalBtn.addEventListener('click', closeReservationModal);
cancelAddReservationBtn.addEventListener('click', closeReservationModal);
reservationModal.addEventListener('click', (e) => e.target === reservationModal && closeReservationModal());

// 表单验证
function validateAddReservationForm() {
    // 定义必填字段（包含退房日期）
    const requiredFields = [
        'reservation-number',
        'guest-id-1',
        'room-id-1',
        'check-in',
        'check-out', // 退房日期设为必填
        'status',
        'total-price' // 总价设为必填
    ];

    const errors = [];
    const fieldLabels = {
        'reservation-number': '预订编号',
        'guest-id-1': '客户',
        'room-id-1': '房间',
        'check-in': '入住日期',
        'check-out': '退房日期',
        'status': '预订状态',
        'total-price': '总价',
        'deposit': '押金'
    };

    // 清除之前的错误样式
    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        input?.classList.remove('border-red-500');
    });

    // 验证必填字段
    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input) {
            console.error(`找不到ID为 ${field} 的表单元素`);
            return;
        }

        const value =
            input.tagName === 'SELECT' ?
            input.value :
            (input.value === null || input.value === undefined ? '' : String(input.value).trim());

        // 检查必填项
        if (value === '' || (input.tagName === 'SELECT' && value === '')) {
            errors.push(`${fieldLabels[field]} 为必填项`);
            input.classList.add('border-red-500');
            return;
        }

        // 特殊字段验证
        switch (field) {
            case 'reservation-number':
                if (!/^[A-Za-z0-9_-]{6,20}$/.test(value)) {
                    errors.push('预订编号需6-20位字母/数字/下划线/连字符');
                    input.classList.add('border-red-500');
                }
                break;

            case 'check-in':
            case 'check-out':
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    errors.push('请选择有效的日期和时间');
                    input.classList.add('border-red-500');
                }
                break;

            case 'total-price':
                const price = parseFloat(value);
                if (isNaN(price) || price <= 0) {
                    errors.push('总价必须为大于0的数字');
                    input.classList.add('border-red-500');
                }
                break;
        }
    });

    // 日期逻辑验证
    const checkIn = document.getElementById('check-in')?.value;
    const checkOut = document.getElementById('check-out')?.value;
    if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (checkOutDate <= checkInDate) {
            errors.push('退房日期必须晚于入住日期');
            document.getElementById('check-in')?.classList.add('border-red-500');
            document.getElementById('check-out')?.classList.add('border-red-500');
        }
    }

    // 押金格式验证
    const depositInput = document.getElementById('deposit');
    if (depositInput?.value.trim()) {
        const deposit = parseFloat(depositInput.value);
        if (isNaN(deposit) || deposit < 0) {
            errors.push('押金必须为≥0的数字');
            depositInput.classList.add('border-red-500');
        }
    }

    // 显示错误信息
    if (errors.length) {
        alert(errors.join('\n'));

        // 滚动到第一个错误字段
        const firstErrorField = document.getElementById(requiredFields.find(field =>
            errors[0].includes(fieldLabels[field])
        ));
        firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        return false;
    }

    return true;
}
// 处理添加/编辑预订
async function handleSaveReservation() {
    if (!validateAddReservationForm()) return;

    const formData = new FormData(reservationForm);
    const data = Object.fromEntries(formData);
    // 处理deposit字段
    if (data.deposit === '') {
        data.deposit = null; // 如果deposit为空字符串，转换为null
    } else {
        data.deposit = parseFloat(data.deposit); // 确保deposit是数值类型
    }
    try {
        let response;
        if (currentReservationOperation === 'add') {
            // 添加预订
            response = await fetch('/reservations', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data
                })
            });
        } else if (currentReservationOperation === 'edit') {
            // 编辑预订
            response = await fetch(`/reservations/${currentReservationId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data
                })
            });
        }

        if (response.ok) {
            showToast(currentReservationOperation === 'add' ? '预订添加成功' : '预订更新成功', 'success');
            closeReservationModal();
            refreshReservationList(currentReservationPage); // 刷新当前页
        } else {
            const error = await response.json();
            showToast(error.error || (currentReservationOperation === 'add' ? '添加失败' : '更新失败'), 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
    }
}

document.getElementById('save-reservation-btn').addEventListener('click', handleSaveReservation);
document.getElementById('filter-reservation-btn').addEventListener('click', handleReservationSearch);

// 查询预订
function handleReservationSearch() {
    refreshReservationList(1)
}

// 刷新预订列表（带分页和筛选）
async function refreshReservationList(page = 1) {
    currentReservationPage = page;
    const room_number = document.getElementById('search-room-number-1').value;
    const status = document.getElementById('filter-reservation-status').value;
    const check_in_start = document.getElementById('filter-checkin-date').value;
    const check_in_end = document.getElementById('filter-checkout-date').value;


    try {
        const response = await fetch(`/reservations?room_number=${room_number}&status=${status}&check_in_start=${check_in_start}&check_in_end=${check_in_end}`);
        const {data, total, pages} = await response.json();
        totalReservationItems = total;
        totalReservationPages = pages;
        renderReservationTable(data);
        renderReservationPagination();
    } catch (error) {
        console.error('刷新失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 渲染预订表格
function renderReservationTable(reservations) {
    const tbody = document.getElementById('reservation-table-body');
    tbody.innerHTML = '';

    if (!reservations.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">暂无预订数据</td></tr>';
        return;
    }

    // 预订状态映射和样式
    const statusMap = {
        1: '待确认',
        2: '已确认',
        3: '已入住',
        4: '已取消'
    };

    const statusClass = {
        1: 'bg-yellow-100 text-yellow-800',   // 待确认
        2: 'bg-green-100 text-green-800',    // 已确认
        3: 'bg-blue-100 text-blue-800',     // 已入住
        4: 'bg-gray-100 text-gray-600'      // 已取消
    };

    reservations.forEach(reservation => {
        const statusId = reservation.status in statusMap ? reservation.status : 1;
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';
        row.innerHTML = `
            <td class="px-6 py-4">${reservation.reservation_number}</td>
            <td class="px-6 py-4">${reservation.guest_name}</td>
            <td class="px-6 py-4">${reservation.room_number}</td>
            <td class="px-6 py-4">${reservation.check_in}</td>
            <td class="px-6 py-4">${reservation.check_out}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 ${statusClass[statusId]} text-xs rounded-full">
                    ${statusMap[statusId]}
                </span>
            </td>
            <td class="px-6 py-4">
               <div class="flex gap-2">
    <button class="text-primary hover:text-primary/80 view-reservation" data-id="${reservation.id}">
        <i class="fa-solid fa-eye"></i>
    </button>
    <button class="text-amber-500 hover:text-amber-500/80 edit-reservation" data-id="${reservation.id}">
        <i class="fa-solid fa-pencil"></i>
    </button>
    <button class="text-red-500 hover:text-red-500/80 delete-reservation" data-id="${reservation.id}">
        <i class="fa-solid fa-trash"></i>
    </button>
</div>
            </td>
        `;
        tbody.appendChild(row);
    });

    bindReservationTableActions();
}

// 渲染分页条
function renderReservationPagination() {
    const info = document.getElementById('reservation-page-info');
    const buttons = document.getElementById('reservation-pagination-buttons');
    buttons.innerHTML = '';

    // 显示页码信息（兼容0条数据的情况）
    info.textContent = totalReservationItems === 0
        ? '暂无数据'
        : `共 ${totalReservationItems} 条记录`;

    // 只有1页或0条数据时，不显示分页按钮
    if (totalReservationPages <= 1) {
        buttons.style.display = 'none';
        return;
    }

    // 显示分页按钮（总页数≥2时）
    buttons.style.display = 'flex';

    // 计算页码范围（确保至少显示当前页）
    const startPage = Math.max(1, currentReservationPage - 2);
    const endPage = Math.min(totalReservationPages, currentReservationPage + 2);

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.addEventListener('click', () => refreshReservationList(currentReservationPage - 1));
    prevBtn.disabled = currentReservationPage === 1;
    buttons.appendChild(prevBtn);

    // 页码按钮（添加省略号逻辑）
    if (startPage > 1) {
        const ellipsisStart = document.createElement('span');
        ellipsisStart.textContent = '...';
        buttons.appendChild(ellipsisStart);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.classList.toggle('active', i === currentReservationPage);
        btn.addEventListener('click', () => refreshReservationList(i));
        buttons.appendChild(btn);
    }

    if (endPage < totalReservationPages) {
        const ellipsisEnd = document.createElement('span');
        ellipsisEnd.textContent = '...';
        buttons.appendChild(ellipsisEnd);
    }

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.addEventListener('click', () => refreshReservationList(currentReservationPage + 1));
    nextBtn.disabled = currentReservationPage === totalReservationPages;
    buttons.appendChild(nextBtn);

    // 禁用状态控制（保留给按钮的disabled属性，span无需处理）
    buttons.querySelectorAll('button').forEach(btn => {
        btn.disabled = btn === prevBtn && prevBtn.disabled || btn === nextBtn && nextBtn.disabled;
    });
}

// 绑定表格操作
function bindReservationTableActions() {
    document.querySelectorAll('.view-reservation').forEach(btn => {
        btn.addEventListener('click', () => viewReservation(btn.dataset.id));
    });
    document.querySelectorAll('.edit-reservation').forEach(btn => {
        btn.addEventListener('click', () => editReservation(btn.dataset.id));
    });
    document.querySelectorAll('.delete-reservation').forEach(btn => {
        btn.addEventListener('click', () => deleteReservation(btn.dataset.id));
    });
}

// 添加预订
function addReservation() {
    currentReservationOperation = 'add';
    currentReservationId = null;

    openReservationModal();
    document.getElementById('reservation-modal-title').innerText = '添加预订';
    // 重置表单并启用所有输入
    reservationForm.reset();
    const inputs = document.querySelectorAll('#reservation-form input, #reservation-form select');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
    });

    // 显示保存按钮
    document.getElementById('save-reservation-btn').style.display = 'inline-block';
    document.getElementById('cancel-reservation-btn').style.display = 'inline-block';
}

// 查看预订详情
async function viewReservation(reservationId) {
    currentReservationOperation = 'view';
    currentReservationId = reservationId;

    try {
        const response = await fetch(`/reservations/${reservationId}`);
        const reservation = await response.json();

        openReservationModal();
        document.getElementById('reservation-modal-title').innerText = '预订详情';

        // 填充表单数据
        document.getElementById('reservation-number').value = reservation.reservation_number;
        document.getElementById('guest-id-1').value = reservation.guest_id;
        document.getElementById('room-id-1').value = reservation.room_id;
        document.getElementById('check-in').value = reservation.check_in;
        document.getElementById('check-out').value = reservation.check_out;
        document.getElementById('status').value = reservation.status;
        document.getElementById('total-price').value = reservation.total_price;
        document.getElementById('deposit').value = reservation.deposit;

        // 禁用所有输入
        const inputs = document.querySelectorAll('#reservation-form input, #reservation-form select, #reservation-form textarea');
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 隐藏保存按钮
        document.getElementById('save-reservation-btn').style.display = 'none';
        document.getElementById('cancel-reservation-btn').style.display = 'none';
    } catch (error) {
        console.error('获取预订详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 编辑预订
async function editReservation(reservationId) {
    currentReservationOperation = 'edit';
    currentReservationId = reservationId;

    try {
        const response = await fetch(`/reservations/${reservationId}`);
        const reservation = await response.json();

        openReservationModal();
        document.getElementById('reservation-modal-title').innerText = '编辑预订';

        // 填充表单数据
        document.getElementById('reservation-number').value = reservation.reservation_number;
        document.getElementById('guest-id-1').value = reservation.guest_id;
        document.getElementById('room-id-1').value = reservation.room_id;
        document.getElementById('check-in').value = reservation.check_in;
        document.getElementById('check-out').value = reservation.check_out;
        document.getElementById('status').value = reservation.status;
        document.getElementById('total-price').value = reservation.total_price;
        document.getElementById('deposit').value = reservation.deposit;

        // 启用所有输入
        const inputs = document.querySelectorAll('#reservation-form input, #reservation-form select,#reservation-form textarea');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 显示保存按钮
        document.getElementById('save-reservation-btn').style.display = 'inline-block';
        document.getElementById('cancel-reservation-btn').style.display = 'inline-block';
    } catch (error) {
        console.error('获取预订详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 删除预订
async function deleteReservation(reservationId) {
    if (confirm('确定要删除这个预订吗？')) {
        try {
            // 注意：DELETE 请求通常需要指定方法
            const response = await fetch(`/reservations/${reservationId}`, {
                method: 'DELETE'  // 明确指定为 DELETE 请求
            });

            if (response.ok) {
                showToast('预订删除成功', 'success');
                refreshReservationList(currentReservationPage); // 刷新当前页
            } else {
                const error = await response.json();
                showToast(error.error || '删除失败', 'error');  // 修正了这里缺少的括号
            }
        } catch (error) {
            console.error('删除预订失败:', error);  // 修正了错误信息
            showToast('网络错误，请重试', 'error');
        }
    }
}

// 显示提示消息
function showToast(message, type = 'info') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out z-50 flex items-center ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
    }`;

    toast.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
                <span>${message}</span>
            `;

    document.body.appendChild(toast);

    // 显示动画
    setTimeout(() => {
        toast.classList.add('translate-y-0');
        toast.classList.remove('-translate-y-20', 'opacity-0');
    }, 10);

    // 自动关闭
    setTimeout(() => {
        toast.classList.add('-translate-y-20', 'opacity-0');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    refreshReservationList(); // 初始加载第一页
});
