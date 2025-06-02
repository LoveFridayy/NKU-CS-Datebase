let currentRoomPage = 1;
const itemsPerRoomPage = 10; // 每页显示条数
let totalRoomItems = 0;
let totalRoomPages = 1;
// 操作模式变量
let currentRoomOperation = 'add'; // 'add' | 'edit' | 'view'
let currentRoomId = null; // 当前编辑的房间ID

// 初始化模态框
const roomModal = document.getElementById('room-modal');
const roomModalContent = document.getElementById('room-modal-content');
const addRoomBtn = document.getElementById('add-room-btn');
const closeRoomModalBtn = document.getElementById('close-room-modal');
const cancelAddRoomBtn = document.getElementById('cancel-room-btn');
const roomForm = document.getElementById('room-form');

// 打开模态框时重置表单
function openRoomModal() {
    roomForm.reset();
    roomModal.classList.remove('hidden');
    roomModal.classList.add('flex');
    setTimeout(() => roomModalContent.classList.remove('scale-95', 'opacity-0'), 10);
}

// 关闭模态框
function closeRoomModal() {
    roomModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        roomModal.classList.remove('flex');
        roomModal.classList.add('hidden');
    }, 300);
}

// 绑定模态框事件
addRoomBtn.addEventListener('click', addRoom);
closeRoomModalBtn.addEventListener('click', closeRoomModal);
cancelAddRoomBtn.addEventListener('click', closeRoomModal);
roomModal.addEventListener('click', (e) => e.target === roomModal && closeRoomModal());

// 表单验证
function validateAddRoomForm() {
    const requiredFields = ['room-number', 'floor', 'room-type', 'area', 'bed-type', 'max-guests', 'status'];
    const errors = [];

    requiredFields.forEach(field => {
        const input = document.getElementById(field);
        if (!input.value.trim() && field !== 'status') {
            errors.push(`请填写${field === 'room-type' ? '房间类型' : field === 'bed-type' ? '床型' : field === 'max-guests' ? '最大入住人数' : field === 'status' ? '房间状态' : field}`);
        }
        if (['floor', 'area', 'max_guests'].includes(field) && isNaN(Number(input.value)) || Number(input.value) <= 0) {
            errors.push(`请输入有效的${field === 'floor' ? '楼层（≥1）' : '数值（≥0）'}`);
        }
    });

    if (errors.length) {
        alert(errors.join('\n'));
        return false;
    }
    return true;
}

// 处理添加/编辑房间
async function handleSaveRoom() {
    if (!validateAddRoomForm()) return;

    const formData = new FormData(roomForm);
    const data = Object.fromEntries(formData);

    try {
        let response;
        if (currentRoomOperation === 'add') {
            // 添加房间
            response = await fetch('/rooms', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data,
                    floor: parseInt(data.floor),
                    area: parseInt(data.area),
                    max_guests: parseInt(data.max_guests),
                })
            });
        } else if (currentRoomOperation === 'edit') {
            // 编辑房间
            response = await fetch(`/rooms/${currentRoomId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data,
                    floor: parseInt(data.floor),
                    area: parseInt(data.area),
                    max_guests: parseInt(data.max_guests),
                })
            });
        }

        if (response.ok) {
            showToast(currentRoomOperation === 'add' ? '房间添加成功' : '房间更新成功', 'success');
            closeRoomModal();
            refreshRoomList(currentRoomPage); // 刷新当前页
        } else {
            const error = await response.json();
            showToast(error.error || (currentRoomOperation === 'add' ? '添加失败' : '更新失败'), 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
    }
}

document.getElementById('save-room-btn').addEventListener('click', handleSaveRoom);
document.getElementById('filter-room-btn').addEventListener('click', handleRoomSearch);

// 查询房间
function handleRoomSearch() {
    refreshRoomList(1)
}

// 刷新房间列表（带分页和筛选）
async function refreshRoomList(page = 1) {
    currentRoomPage = page;
    const search = document.getElementById('search-room-number').value;
    const type = document.getElementById('filter-room-type').value;
    const status = document.getElementById('filter-status').value;

    try {
        const response = await fetch(`/rooms?page=${page}&per_page=${itemsPerRoomPage}&search=${search}&type=${type}&status=${status}`);
        const {data, total, pages} = await response.json();
        totalRoomItems = total;
        totalRoomPages = pages;
        renderRoomTable(data);
        renderRoomPagination();
    } catch (error) {
        console.error('刷新失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 渲染房间表格
function renderRoomTable(rooms) {
    const tbody = document.getElementById('rooms-table-body');
    tbody.innerHTML = '';

    if (!rooms.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4">暂无房间数据</td></tr>';
        return;
    }

    rooms.forEach(room => {
        const statusClass = getStatusClass(room.room_status.id);
        const statusText = room.room_status.name;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${room.room_number}</td>
            <td class="px-6 py-4">${room.room_type.name}</td>
            <td class="px-6 py-4">¥${room.room_type.base_price}/晚</td>
            <td class="px-6 py-4"><span class="px-2 py-1 ${statusClass} text-xs rounded-full">${statusText}</span></td>
            <td class="px-6 py-4">${room.area}m²</td>
            <td class="px-6 py-4">${room.bed_type}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button class="text-primary hover:text-primary/80 view-room" data-id="${room.id}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="text-amber-500 hover:text-amber-500/80 edit-room" data-id="${room.id}">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-500/80 delete-room" data-id="${room.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    bindRoomTableActions();
}

// 渲染分页条
function renderRoomPagination() {
    const info = document.getElementById('room-page-info');
    const buttons = document.getElementById('room-pagination-buttons');
    buttons.innerHTML = '';

    // 显示页码信息（兼容0条数据的情况）
    info.textContent = totalRoomItems === 0
        ? '暂无数据'
        : `共 ${totalRoomItems} 条记录`;

    // 只有1页或0条数据时，不显示分页按钮
    if (totalRoomPages <= 1) {
        buttons.style.display = 'none';
        return;
    }

    // 显示分页按钮（总页数≥2时）
    buttons.style.display = 'flex';

    // 计算页码范围（确保至少显示当前页）
    const startPage = Math.max(1, currentRoomPage - 2);
    const endPage = Math.min(totalRoomPages, currentRoomPage + 2);

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.addEventListener('click', () => refreshRoomList(currentRoomPage - 1));
    prevBtn.disabled = currentRoomPage === 1;
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
        btn.classList.toggle('active', i === currentRoomPage);
        btn.addEventListener('click', () => refreshRoomList(i));
        buttons.appendChild(btn);
    }

    if (endPage < totalRoomPages) {
        const ellipsisEnd = document.createElement('span');
        ellipsisEnd.textContent = '...';
        buttons.appendChild(ellipsisEnd);
    }

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.addEventListener('click', () => refreshRoomList(currentRoomPage + 1));
    nextBtn.disabled = currentRoomPage === totalRoomPages;
    buttons.appendChild(nextBtn);

    // 禁用状态控制（保留给按钮的disabled属性，span无需处理）
    buttons.querySelectorAll('button').forEach(btn => {
        btn.disabled = btn === prevBtn && prevBtn.disabled || btn === nextBtn && nextBtn.disabled;
    });
}

// 状态类映射
function getStatusClass(statusId) {
    return {
        1: 'bg-green-100 text-green-600', // 可用
        2: 'bg-red-100 text-red-600',   // 已入住
        3: 'bg-blue-100 text-blue-600',  // 已预订
        4: 'bg-yellow-100 text-yellow-600' // 维护中
    }[statusId] || 'bg-gray-100 text-gray-600';
}

// 绑定表格操作
function bindRoomTableActions() {
    document.querySelectorAll('.view-room').forEach(btn => {
        btn.addEventListener('click', () => viewRoom(btn.dataset.id));
    });
    document.querySelectorAll('.edit-room').forEach(btn => {
        btn.addEventListener('click', () => editRoom(btn.dataset.id));
    });
    document.querySelectorAll('.delete-room').forEach(btn => {
        btn.addEventListener('click', () => deleteRoom(btn.dataset.id));
    });
}

// 添加房间
function addRoom() {
    currentRoomOperation = 'add';
    currentRoomId = null;

    openRoomModal();
    document.getElementById('room-modal-title').innerText = '添加房间';

    // 重置表单并启用所有输入
    roomForm.reset();
    const inputs = document.querySelectorAll('#room-form input, #room-form select, #room-form textarea');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
    });

    // 显示保存按钮
    document.getElementById('save-room-btn').style.display = 'inline-block';
    document.getElementById('cancel-room-btn').style.display = 'inline-block';
}

// 查看房间详情
async function viewRoom(roomId) {
    currentRoomOperation = 'view';
    currentRoomId = roomId;

    try {
        const response = await fetch(`/rooms/${roomId}`);
        const room = await response.json();

        openRoomModal();
        document.getElementById('room-modal-title').innerText = '房间详情';

        // 填充表单数据
        document.getElementById('room-number').value = room.room_number;
        document.getElementById('floor').value = room.floor;
        document.getElementById('room-type').value = room.room_type.id;
        document.getElementById('area').value = room.area;
        document.getElementById('bed-type').value = room.bed_type;
        document.getElementById('max-guests').value = room.max_guests;
        document.getElementById('status').value = room.room_status.id;
        document.getElementById('description').value = room.description;

        // 禁用所有输入
        const inputs = document.querySelectorAll('#room-form input, #room-form select, #room-form textarea');
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 隐藏保存按钮
        document.getElementById('save-room-btn').style.display = 'none';
        document.getElementById('cancel-room-btn').style.display = 'none';
    } catch (error) {
        console.error('获取房间详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 编辑房间
async function editRoom(roomId) {
    currentRoomOperation = 'edit';
    currentRoomId = roomId;

    try {
        const response = await fetch(`/rooms/${roomId}`);
        const room = await response.json();

        openRoomModal();
        document.getElementById('room-modal-title').innerText = '编辑房间';

        // 填充表单数据
        document.getElementById('room-number').value = room.room_number;
        document.getElementById('floor').value = room.floor;
        document.getElementById('room-type').value = room.room_type.id;
        document.getElementById('area').value = room.area;
        document.getElementById('bed-type').value = room.bed_type;
        document.getElementById('max-guests').value = room.max_guests;
        document.getElementById('status').value = room.room_status.id;
        document.getElementById('description').value = room.description;

        // 启用所有输入
        const inputs = document.querySelectorAll('#room-form input, #room-form select, #room-form textarea');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 显示保存按钮
        document.getElementById('save-room-btn').style.display = 'inline-block';
        document.getElementById('cancel-room-btn').style.display = 'inline-block';
    } catch (error) {
        console.error('获取房间详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 删除房间
async function deleteRoom(roomId) {
    if (confirm('确定要删除这个房间吗？')) {
        try {
            // 注意：DELETE 请求通常需要指定方法
            const response = await fetch(`/rooms/${roomId}`, {
                method: 'DELETE'  // 明确指定为 DELETE 请求
            });

            if (response.ok) {
                showToast('房间删除成功', 'success');
                refreshRoomList(currentRoomPage); // 刷新当前页
            } else {
                const error = await response.json();
                showToast(error.error || '删除失败', 'error');  // 修正了这里缺少的括号
            }
        } catch (error) {
            console.error('删除房间失败:', error);  // 修正了错误信息
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
    refreshRoomList(); // 初始加载第一页
});