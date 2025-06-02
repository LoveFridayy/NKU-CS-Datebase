let currentServicePage = 1;
const itemsPerServicePage = 10; // 每页显示条数
let totalServiceItems = 0;
let totalServicePages = 1;
// 操作模式变量
let currentServiceOperation = 'add'; // 'add' | 'edit' | 'view'
let currentServiceId = null; // 当前编辑的服务ID

// 初始化模态框
const serviceModal = document.getElementById('service-modal');
const serviceModalContent = document.getElementById('service-modal-content');
const addServiceBtn = document.getElementById('add-service-btn');
const closeServiceModalBtn = document.getElementById('close-service-modal');
const cancelAddServiceBtn = document.getElementById('cancel-service-btn');
const serviceForm = document.getElementById('service-form');

// 打开模态框时重置表单
function openServiceModal() {
    serviceForm.reset();
    serviceModal.classList.remove('hidden');
    serviceModal.classList.add('flex');
    setTimeout(() => serviceModalContent.classList.remove('scale-95', 'opacity-0'), 10);
}

// 关闭模态框
function closeServiceModal() {
    serviceModalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        serviceModal.classList.remove('flex');
        serviceModal.classList.add('hidden');
    }, 300);
}

// 绑定模态框事件
addServiceBtn.addEventListener('click', addService);
closeServiceModalBtn.addEventListener('click', closeServiceModal);
cancelAddServiceBtn.addEventListener('click', closeServiceModal);
serviceModal.addEventListener('click', (e) => e.target === serviceModal && closeServiceModal());

// 表单验证
function validateAddServiceForm() {
    const requiredFields = ['service-name', 'service-price', 'service-type']; // 服务表单必填字段
    const errors = [];

    requiredFields.forEach(field => {
        const input = document.getElementById(field);

        // 检查元素是否存在
        if (!input) {
            console.error(`找不到ID为 ${field} 的表单元素`);
            return;
        }

        // 统一处理值（包括select元素）
        const value =
            input.tagName === 'SELECT' ?
                input.value :
                (input.value === null || input.value === undefined ? '' : String(input.value).trim());

        // 必填验证
        if (value === '' || (input.tagName === 'SELECT' && value === '')) {
            errors.push(`请填写 ${getFieldLabel(field)}`);
            return; // 跳过其他验证
        }

        // 特殊字段验证
        switch (field) {
            case 'service-price': // 价格验证
                const price = parseFloat(value);
                if (isNaN(price) || price < 0) {
                    errors.push('服务价格必须为≥0的数字（支持两位小数）');
                }
                break;
        }
    });

    // 额外验证：服务描述长度（可选字段限制200字）
    const description = document.getElementById('service-description')?.value?.trim();
    if (description && description.length > 200) {
        errors.push('服务描述不能超过200字');
    }

    if (errors.length) {
        alert(errors.join('\n'));
        return false;
    }
    return true;
}

// 辅助函数：获取字段中文名称
function getFieldLabel(fieldId) {
    const labelMap = {
        'service-name': '服务名称',
        'service-price': '服务价格',
        'service-type': '服务类型',
        'service-description': '服务描述'
    };
    return labelMap[fieldId] || '该字段';
}

// 处理添加/编辑服务
async function handleSaveService() {
    if (!validateAddServiceForm()) return;

    const formData = new FormData(serviceForm);
    const data = Object.fromEntries(formData);

    try {
        let response;
        if (currentServiceOperation === 'add') {
            // 添加服务
            response = await fetch('/services', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data
                })
            });
        } else if (currentServiceOperation === 'edit') {
            // 编辑服务
            response = await fetch(`/services/${currentServiceId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    ...data
                })
            });
        }

        if (response.ok) {
            showToast(currentServiceOperation === 'add' ? '服务添加成功' : '服务更新成功', 'success');
            closeServiceModal();
            refreshServiceList(currentServicePage); // 刷新当前页
        } else {
            const error = await response.json();
            showToast(error.error || (currentServiceOperation === 'add' ? '添加失败' : '更新失败'), 'error');
        }
    } catch (error) {
        showToast('网络错误，请重试', 'error');
    }
}

document.getElementById('save-service-btn').addEventListener('click', handleSaveService);
document.getElementById('filter-service-btn').addEventListener('click', handleServiceSearch);

// 查询服务
function handleServiceSearch() {
    refreshServiceList(1)
}

// 刷新服务列表（带分页和筛选）
async function refreshServiceList(page = 1) {
    currentServicePage = page;
    const name = document.getElementById('search-service-name').value;
    const type_id = document.getElementById('filter-service-type').value;

    try {
        const response = await fetch(`/services?page=${page}&per_page=${itemsPerServicePage}&name=${name}&type_id=${type_id}`);
        const {data, total, pages} = await response.json();
        totalServiceItems = total;
        totalServicePages = pages;
        renderServiceTable(data);
        renderServicePagination();
    } catch (error) {
        console.error('刷新失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 渲染服务表格
function renderServiceTable(services) {
    const tbody = document.getElementById('service-table-body');
    tbody.innerHTML = '';

    if (!services.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">暂无服务数据</td></tr>';
        return;
    }

    // 服务类型映射和样式
    const serviceTypeMap = {
        1: '基础服务',
        2: '餐饮服务',
        3: '娱乐休闲',
        4: '商务服务',
        5: '接送服务'
    };

    const serviceTypeClass = {
        1: 'bg-blue-100 text-blue-800',   // 基础服务
        2: 'bg-green-100 text-green-800',  // 餐饮服务
        3: 'bg-purple-100 text-purple-800', // 娱乐休闲
        4: 'bg-amber-100 text-amber-800',  // 商务服务
        5: 'bg-gray-100 text-gray-800'     // 其他服务（新增）
    };

    services.forEach(service => {
        const typeId = service.type_id in serviceTypeMap ? service.type_id : 1;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${service.name}</td>
            <td class="px-6 py-4">
                <div class="text-sm">${service.description}</div>
                <div class="text-xs text-gray-500 mt-1">创建于: ${service.created_at}</div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 ${serviceTypeClass[typeId]} text-xs rounded-full">
                    ${serviceTypeMap[typeId]}
                </span>
            </td>
            <td class="px-6 py-4 font-medium">¥${service.price.toFixed(2)}</td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    <button class="text-primary hover:text-primary/80 view-service" data-id="${service.id}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="text-amber-500 hover:text-amber-500/80 edit-service" data-id="${service.id}">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-500/80 delete-service" data-id="${service.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });

    bindServiceTableActions();
}

// 渲染分页条
function renderServicePagination() {
    const info = document.getElementById('service-page-info');
    const buttons = document.getElementById('service-pagination-buttons');
    buttons.innerHTML = '';

    // 显示页码信息（兼容0条数据的情况）
    info.textContent = totalServiceItems === 0
        ? '暂无数据'
        : `共 ${totalServiceItems} 条记录`;

    // 只有1页或0条数据时，不显示分页按钮
    if (totalServicePages <= 1) {
        buttons.style.display = 'none';
        return;
    }

    // 显示分页按钮（总页数≥2时）
    buttons.style.display = 'flex';

    // 计算页码范围（确保至少显示当前页）
    const startPage = Math.max(1, currentServicePage - 2);
    const endPage = Math.min(totalServicePages, currentServicePage + 2);

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.addEventListener('click', () => refreshServiceList(currentServicePage - 1));
    prevBtn.disabled = currentServicePage === 1;
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
        btn.classList.toggle('active', i === currentServicePage);
        btn.addEventListener('click', () => refreshServiceList(i));
        buttons.appendChild(btn);
    }

    if (endPage < totalServicePages) {
        const ellipsisEnd = document.createElement('span');
        ellipsisEnd.textContent = '...';
        buttons.appendChild(ellipsisEnd);
    }

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.addEventListener('click', () => refreshServiceList(currentServicePage + 1));
    nextBtn.disabled = currentServicePage === totalServicePages;
    buttons.appendChild(nextBtn);

    // 禁用状态控制（保留给按钮的disabled属性，span无需处理）
    buttons.querySelectorAll('button').forEach(btn => {
        btn.disabled = btn === prevBtn && prevBtn.disabled || btn === nextBtn && nextBtn.disabled;
    });
}

// 绑定表格操作
function bindServiceTableActions() {
    document.querySelectorAll('.view-service').forEach(btn => {
        btn.addEventListener('click', () => viewService(btn.dataset.id));
    });
    document.querySelectorAll('.edit-service').forEach(btn => {
        btn.addEventListener('click', () => editService(btn.dataset.id));
    });
    document.querySelectorAll('.delete-service').forEach(btn => {
        btn.addEventListener('click', () => deleteService(btn.dataset.id));
    });
}

// 添加服务
function addService() {
    currentServiceOperation = 'add';
    currentServiceId = null;

    openServiceModal();
    document.getElementById('service-modal-title').innerText = '添加服务';
    // 重置表单并启用所有输入
    serviceForm.reset();
    const inputs = document.querySelectorAll('#service-form input, #service-form select,#service-form textarea');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
    });

    // 显示保存按钮
    document.getElementById('save-service-btn').style.display = 'inline-block';
    document.getElementById('cancel-service-btn').style.display = 'inline-block';
}

// 查看服务详情
async function viewService(serviceId) {
    currentServiceOperation = 'view';
    currentServiceId = serviceId;

    try {
        const response = await fetch(`/services/${serviceId}`);
        const service = await response.json();

        openServiceModal();
        document.getElementById('service-modal-title').innerText = '服务详情';

        // 填充表单数据
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-price').value = service.price;
        document.getElementById('service-type').value = service.type_id;
        document.getElementById('service-description').value = service.description;

        // 禁用所有输入
        const inputs = document.querySelectorAll('#service-form input, #service-form select, #service-form textarea');
        inputs.forEach(input => {
            input.disabled = true;
            input.classList.add('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 隐藏保存按钮
        document.getElementById('save-service-btn').style.display = 'none';
        document.getElementById('cancel-service-btn').style.display = 'none';
    } catch (error) {
        console.error('获取服务详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 编辑服务
async function editService(serviceId) {
    currentServiceOperation = 'edit';
    currentServiceId = serviceId;

    try {
        const response = await fetch(`/services/${serviceId}`);
        const service = await response.json();

        openServiceModal();
        document.getElementById('service-modal-title').innerText = '编辑服务';

        // 填充表单数据
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-price').value = service.price;
        document.getElementById('service-type').value = service.type_id;
        document.getElementById('service-description').value = service.description;

        // 启用所有输入
        const inputs = document.querySelectorAll('#service-form input, #service-form select,#service-form textarea');
        inputs.forEach(input => {
            input.disabled = false;
            input.classList.remove('bg-gray-50', 'text-gray-500', 'cursor-not-allowed');
        });

        // 显示保存按钮
        document.getElementById('save-service-btn').style.display = 'inline-block';
        document.getElementById('cancel-service-btn').style.display = 'inline-block';
    } catch (error) {
        console.error('获取服务详情失败:', error);
        showToast('数据加载失败，请重试', 'error');
    }
}

// 删除服务
async function deleteService(serviceId) {
    if (confirm('确定要删除这个服务吗？')) {
        try {
            // 注意：DELETE 请求通常需要指定方法
            const response = await fetch(`/services/${serviceId}`, {
                method: 'DELETE'  // 明确指定为 DELETE 请求
            });

            if (response.ok) {
                showToast('服务删除成功', 'success');
                refreshServiceList(currentServicePage); // 刷新当前页
            } else {
                const error = await response.json();
                showToast(error.error || '删除失败', 'error');  // 修正了这里缺少的括号
            }
        } catch (error) {
            console.error('删除服务失败:', error);  // 修正了错误信息
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
    refreshServiceList(); // 初始加载第一页
});
