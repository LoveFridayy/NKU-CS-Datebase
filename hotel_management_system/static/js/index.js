// 全局变量
let currentUser = null;
let authToken = null;
document.addEventListener('DOMContentLoaded', function () {
    // 初始化日期显示
    initDateDisplay();

    // 检查用户认证状态
    checkAuthentication();

    // 初始化图表（静态数据）
    initStaticCharts();

    // 初始化导航
    initNavigation();

    //初始化表格交互
    initTableInteractions()


    // 页面加载完成，隐藏加载动画
    setTimeout(() => {
        document.getElementById('loader').classList.add('opacity-0');
        setTimeout(() => {
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('app-content').classList.remove('opacity-0');
        }, 500);
    }, 800);
});

// 初始化日期显示
function initDateDisplay() {
    const dateOptions = {year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'};
    const currentDate = new Date().toLocaleDateString('zh-CN', dateOptions);
    document.getElementById('current-date').textContent = currentDate;
}

// 检查用户认证状态
function checkAuthentication() {
    authToken = sessionStorage.getItem('auth_token');
    currentUser = JSON.parse(sessionStorage.getItem('user_data'));

    if (!authToken || !currentUser) {
        // 未登录，重定向到登录页
        window.location.href = '/login';
        return;
    }

    // 显示用户信息
    document.getElementById('full-name').textContent = currentUser.full_name || '系统管理员';
    document.getElementById('email').textContent = currentUser.email || 'admin@hotel.com';
}

// 初始化图表（使用静态数据）
function initStaticCharts() {
    // 入住趋势图表
    const occupancyCtx = document.getElementById('occupancyChart')?.getContext('2d');
    if (occupancyCtx) {
        new Chart(occupancyCtx, {
            type: 'line',
            data: {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                datasets: [{
                    label: '入住率',
                    data: [65, 70, 68, 75, 80, 90, 85],
                    borderColor: '#165DFF',
                    backgroundColor: 'rgba(22, 93, 255, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {display: false},
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                return `入住率: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {callback: val => `${val}%`}
                    }
                }
            }
        });
    }

    // 房间类型分布图表
    const roomTypeCtx = document.getElementById('roomTypeChart')?.getContext('2d');
    if (roomTypeCtx) {
        new Chart(roomTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['标准间', '豪华间', '套房', '家庭房'],
                datasets: [{
                    data: [40, 30, 15, 15],
                    backgroundColor: [
                        '#165DFF', // 主色
                        '#36CFC9', // 辅助色1
                        '#722ED1', // 辅助色2
                        '#FF7D00'  // 辅助色3
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {position: 'bottom'},
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${percentage}%`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// 初始化导航
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();

            // 更新导航状态
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');

            // 显示对应页面
            const pageId = this.getAttribute('data-page');
            const pages = document.querySelectorAll('.page-content');
            pages.forEach(page => page.classList.add('hidden'));
            document.getElementById(`page-${pageId}`)?.classList.remove('hidden');

            // 关闭侧边栏（移动端）
            if (window.innerWidth < 768) {
                document.getElementById('sidebar').classList.add('-translate-x-full');
            }

            // 页面切换动画
            const activePage = document.getElementById(`page-${pageId}`);
            if (activePage) {
                activePage.style.opacity = '0';
                setTimeout(() => {
                    activePage.style.opacity = '1';
                    activePage.style.transition = 'opacity 0.3s ease-in-out';
                }, 50);
            }
        });
    });
}


// 初始化表格行交互
function initTableInteractions() {
    // 为表格行添加悬停效果
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        table.addEventListener('mouseover', function (e) {
            if (e.target.closest('tr')) {
                e.target.closest('tr').classList.add('bg-gray-50');
            }
        });

        table.addEventListener('mouseout', function (e) {
            if (e.target.closest('tr')) {
                e.target.closest('tr').classList.remove('bg-gray-50');
            }
        });
    });
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 flex items-center ${
        type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
                type === 'warning' ? 'bg-yellow-500 text-white' :
                    'bg-blue-500 text-white'
    }`;

    toast.innerHTML = `
            <i class="fa-solid fa-${
        type === 'success' ? 'check-circle' :
            type === 'error' ? 'exclamation-circle' :
                type === 'warning' ? 'exclamation-triangle' :
                    'info-circle'
    } mr-2"></i>
            <span>${message}</span>
        `;

    document.body.appendChild(toast);

    // 3秒后自动消失
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

const logoutBtn = document.getElementById('log-out-btn')

logoutBtn.addEventListener('click', logout)

function logout() {
    // 添加确认对话框，防止误操作
    if (confirm('确定要退出登录吗？')) {
        // 清除会话存储中的认证令牌和用户数据
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user_data');

        // 跳转到登录页面
        window.location.href = '/login';
    }
}