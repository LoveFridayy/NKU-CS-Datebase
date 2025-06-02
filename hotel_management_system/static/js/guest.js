let currentGuestPage = 1;
const itemsPerGuestPage = 10; // 每页显示条数
let totalGuestItems = 0;
let totalGuestPages = 1;
// 操作模式变量
let currentGuestOperation = 'add'; // 'add' | 'edit' | 'view'
let currentGuestId = null; // 当前编辑的客户ID

// 初始化模态框
const guestModal = document.getElementById('guest-modal');
const guestModalContent = document.getElementById('guest-modal-content');
const addGuestBtn = document.getElementById('add-guest-btn');
const closeGuestModalBtn = document.getElementById('close-guest-modal');
const cancelAddGuestBtn = document.getElementById('cancel-guest-btn');
const guestForm = document.getElementById('guest-form');

// 打开模态框时重置表单
function openGuestModal() {
    guestForm.reset();
    guestModal.classList.remove('hidden');
    guestModal.classList.add('flex');
    setTimeout(() => guestModalContent.classList.remove('scale-95', 'opacity-0'), 10);
}

// 关闭模态框
function closeGuestModal() {
    guestModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        guestModal.classList.remove('flex');
        guestModal.classList.add('hidden');
    }, 300);
}

// 绑定模态框事件
addGuestBtn.addEventListener('click', addGuest);
closeGuestModalBtn.addEventListener('click', closeGuestModal);
cancelAddGuestBtn.addEventListener('click', closeGuestModal);
guestModal.addEventListener('click', (e) => e.target === guestModal && closeGuestModal());

// 表单验证
function validateAddGuestForm() {
    const requiredFields = ['name', 'phone', 'id-number', 'guest-email', 'address', 'vip-level', 'total-spent'];
    const errors = [];
    requiredFields.forEach(field => {
        const input = document.getElementById(field);

        // 检查输入元素是否存在
        if (!input) {
            console.error(`找不到ID为${field}的表单元素`);
            return;
        }

        // 安全获取输入值并处理空值
        const value = input.value === null || input.value === undefined ? '' : String(input.value).trim();

        // 必填字段验证
        if (value === '') {
            errors.push(`请填写${
                field === 'name' ? '客户姓名' :
                    field === 'phone' ? '联系电话' :
                        field === 'id-number' ? '身份证号' :
                            field === 'email' ? '电子邮箱' :
                                field === 'address' ? '联系地址' :
                                    field === 'vip-level' ? 'VIP等级' :
                                        '累计消费'
            }`);
            return; // 跳过该字段的其他验证
        }

        // 特殊字段验证
        if (field === 'phone' && !/^1[3-9]\d{9}$/.test(value)) {
            errors.push('请输入有效的手机号（11位数字，1开头）');
        }

        if (field === 'id-number' && !/(^\d{15}$)|(^\d{17}[\dXx]$)/.test(value)) {
            errors.push('请输入有效的身份证号（15位数字或18位数字，最后一位可以是X）');
        }

        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push('请输入有效的邮箱地址（例如：example@domain.com）');
        }

        if (field === 'vip-level' && value === '0') {
            errors.push('请选择VIP等级');
        }

        if (field === 'total-spent') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
                errors.push('累计消费必须为≥0的数字');
            }
        }
    });

    if (errors.length) {
        alert(errors.join('\n'));
        return false;
    }
    return true;
}

// 处理添加/编辑客户
async function handleSaveGuest() {
    if (!validateAddGuestForm()) return;

    const formData = new FormData(guestForm);
    const data = Object.fromEntries(formData);

    try {
        let response;
        if (currentGuestOperation === 'add') {
            // 添加客户
            response = await fetch('/guests', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data
                })
            });
        } else if (currentGuestOperation === 'edit') {
            // 编辑客户
            response = await fetch(`/guests/${currentGuestId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data
                })
            });
        }

        if (response.ok) {
            showToast(currentGuestOperation === 'add' ? '客户添加成功' : '客户更新成功', 'success');
            closeGuestModal();
            refreshGuestList(currentGuestPage); // 刷新当前页
        } else {
            const error = await response.json();
            showToast(error.error || (currentGuestOperation === 'add' ? '添加失败' : '更新失败'), 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
    }
}

document.getElementById('save-guest-btn').addEventListener('click', handleSaveGuest);
document.getElementById('filter-guest-btn').addEventListener('click', handleGuestSearch);

// 查询客户
function handleGuestSearch() {
    refreshGuestList(1)
}

// 刷新客户列表（带分页和筛选）
async function refreshGuestList(page = 1) {
    currentGuestPage = page;
    const name = document.getElementById('search-guest-name').value;
    const phone = document.getElementById('search-guest-phone').value;
    const vip_level = document.getElementById('filter-guest-vip-level').value;

    try {
        const response = await fetch(`/guests?page=${page}&per_page=${itemsPerGuestPage}&name=${name}&phone=${phone}&vip_level=${vip_level}`);
        const {data, total, pages} = await response.json();
        totalGuestItems = total;
        totalGuestPages = pages;
        renderGuestTable(data);
        renderGuestPagination();
    } catch (error) {
        console.error('刷新失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 渲染客户表格
function renderGuestTable(guests) {
    const tbody = document.getElementById('guests-table-body');
    tbody.innerHTML = '';

    if (!guests.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">暂无客户数据</td></tr>';
        return;
    }

    // VIP等级映射
    const vipLevelMap = {
        0: '白银会员',
        1: '黄金会员',
        2: '白金会员',
        3: '钻石会员'
    };

    // VIP等级样式映射
    const vipLevelClass = {
        0: 'bg-gray-100 text-gray-800',
        1: 'bg-slate-100 text-slate-800',
        2: 'bg-yellow-100 text-yellow-800',
        3: 'bg-purple-100 text-purple-800'
    };

    guests.forEach(guest => {
        const vipLevel = guest.vip_level in vipLevelMap ? guest.vip_level : 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${guest.name}</td>
            <td class="px-6 py-4">
                <div class="space-y-1">
                    <div>${guest.phone}</div>
                    <div class="text-xs text-gray-500">${guest.email}</div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 ${vipLevelClass[vipLevel]} text-xs rounded-full">
                    ${vipLevelMap[vipLevel]}
                </span>
            </td>
            <td class="px-6 py-4">¥${guest.total_spent.toFixed(2)}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button class="text-primary hover:text-primary/80 view-guest" data-id="${guest.id}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="text-amber-500 hover:text-amber-500/80 edit-guest" data-id="${guest.id}">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-500/80 delete-guest" data-id="${guest.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    bindGuestTableActions();
}

// 渲染分页条
function renderGuestPagination() {
    const info = document.getElementById('guest-page-info');
    const buttons = document.getElementById('guest-pagination-buttons');
    buttons.innerHTML = '';

    // 显示页码信息（兼容0条数据的情况）
    info.textContent = totalGuestItems === 0
        ? '暂无数据'
        : `共 ${totalGuestItems} 条记录`;

    // 只有1页或0条数据时，不显示分页按钮
    if (totalGuestPages <= 1) {
        buttons.style.display = 'none';
        return;
    }

    // 显示分页按钮（总页数≥2时）
    buttons.style.display = 'flex';

    // 计算页码范围（确保至少显示当前页）
    const startPage = Math.max(1, currentGuestPage - 2);
    const endPage = Math.min(totalGuestPages, currentGuestPage + 2);

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.addEventListener('click', () => refreshGuestList(currentGuestPage - 1));
    prevBtn.disabled = currentGuestPage === 1;
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
        btn.classList.toggle('active', i === currentGuestPage);
        btn.addEventListener('click', () => refreshGuestList(i));
        buttons.appendChild(btn);
    }

    if (endPage < totalGuestPages) {
        const ellipsisEnd = document.createElement('span');
        ellipsisEnd.textContent = '...';
        buttons.appendChild(ellipsisEnd);
    }

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.addEventListener('click', () => refreshGuestList(currentGuestPage + 1));
    nextBtn.disabled = currentGuestPage === totalGuestPages;
    buttons.appendChild(nextBtn);

    // 禁用状态控制（保留给按钮的disabled属性，span无需处理）
    buttons.querySelectorAll('button').forEach(btn => {
        btn.disabled = btn === prevBtn && prevBtn.disabled || btn === nextBtn && nextBtn.disabled;
    });
}

// 绑定表格操作
function bindGuestTableActions() {
    document.querySelectorAll('.view-guest').forEach(btn => {
        btn.addEventListener('click', () => viewGuest(btn.dataset.id));
    });
    document.querySelectorAll('.edit-guest').forEach(btn => {
        btn.addEventListener('click', () => editGuest(btn.dataset.id));
    });
    document.querySelectorAll('.delete-guest').forEach(btn => {
        btn.addEventListener('click', () => deleteGuest(btn.dataset.id));
    });
}

// 添加客户
function addGuest() {
    currentGuestOperation = 'add';
    currentGuestId = null;

    openGuestModal();
    document.getElementById('guest-modal-title').innerText = '添加客户';
    // 重置表单并启用所有输入
    guestForm.reset();
    const inputs = document.querySelectorAll('#guest-form input, #guest-form select');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
    });

    // 显示保存按钮
    document.getElementById('save-guest-btn').style.display = 'inline-block';
    document.getElementById('cancel-guest-btn').style.display = 'inline-block';
}

// 查看客户详情
async function viewGuest(guestId) {
    currentGuestOperation = 'view';
    currentGuestId = guestId;

    try {
        const response = await fetch(`/guests/${guestId}`);
        const guest = await response.json();

        openGuestModal();
        document.getElementById('guest-modal-title').innerText = '客户详情';

        // 填充表单数据
        document.getElementById('name').value = guest.name;
        document.getElementById('phone').value = guest.phone;
        document.getElementById('id-number').value = guest.id_number;
        document.getElementById('guest-email').value = guest.email;
        document.getElementById('address').value = guest.address;
        document.getElementById('vip-level').value = guest.vip_level;
        document.getElementById('total-spent').value = guest.total_spent;

        // 禁用所有输入
        const inputs = document.querySelectorAll('#guest-form input, #guest-form select, #guest-form textarea');
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 隐藏保存按钮
        document.getElementById('save-guest-btn').style.display = 'none';
        document.getElementById('cancel-guest-btn').style.display = 'none';
    } catch (error) {
        console.error('获取客户详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 编辑客户
async function editGuest(guestId) {
    currentGuestOperation = 'edit';
    currentGuestId = guestId;

    try {
        const response = await fetch(`/guests/${guestId}`);
        const guest = await response.json();

        openGuestModal();
        document.getElementById('guest-modal-title').innerText = '编辑客户';

        // 填充表单数据
        document.getElementById('name').value = guest.name;
        document.getElementById('phone').value = guest.phone;
        document.getElementById('id-number').value = guest.id_number;
        document.getElementById('guest-email').value = guest.email;
        document.getElementById('address').value = guest.address;
        document.getElementById('vip-level').value = guest.vip_level;
        document.getElementById('total-spent').value = guest.total_spent;

        // 启用所有输入
        const inputs = document.querySelectorAll('#guest-form input, #guest-form select');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 显示保存按钮
        document.getElementById('save-guest-btn').style.display = 'inline-block';
        document.getElementById('cancel-guest-btn').style.display = 'inline-block';
    } catch (error) {
        console.error('获取客户详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 删除客户
async function deleteGuest(guestId) {
    if (confirm('确定要删除这个客户吗？')) {
        try {
            // 注意：DELETE 请求通常需要指定方法
            const response = await fetch(`/guests/${guestId}`, {
                method: 'DELETE'  // 明确指定为 DELETE 请求
            });

            if (response.ok) {
                showToast('客户删除成功', 'success');
                refreshGuestList(currentGuestPage); // 刷新当前页
            } else {
                const error = await response.json();
                showToast(error.error || '删除失败', 'error');  // 修正了这里缺少的括号
            }
        } catch (error) {
            console.error('删除客户失败:', error);  // 修正了错误信息
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
    refreshGuestList(); // 初始加载第一页
});
