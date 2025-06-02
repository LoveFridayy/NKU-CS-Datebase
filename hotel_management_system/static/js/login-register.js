// 获取所有需要的元素
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegisterBtn = document.getElementById('switch-to-register');
const switchToLoginBtn = document.getElementById('switch-to-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const toggleLoginPassword = document.getElementById('toggle-login-password');
const toggleRegisterPassword = document.getElementById('toggle-register-password');
const toggleConfirmPassword = document.getElementById('toggle-confirm-password');

// 表单切换函数
function showLoginForm() {
    loginTab.classList.add('text-primary', 'border-primary');
    loginTab.classList.remove('text-gray-500', 'border-transparent');
    registerTab.classList.add('text-gray-500', 'border-transparent');
    registerTab.classList.remove('text-primary', 'border-primary');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
}

function showRegisterForm() {
    registerTab.classList.add('text-primary', 'border-primary');
    registerTab.classList.remove('text-gray-500', 'border-transparent');
    loginTab.classList.add('text-gray-500', 'border-transparent');
    loginTab.classList.remove('text-primary', 'border-primary');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
}

// 表单切换事件监听
loginTab.addEventListener('click', showLoginForm);
registerTab.addEventListener('click', showRegisterForm);
switchToRegisterBtn.addEventListener('click', showRegisterForm);
switchToLoginBtn.addEventListener('click', showLoginForm);

// 密码显示/隐藏功能
function setupPasswordToggle(button, inputId) {
    if (button && document.getElementById(inputId)) {
        button.addEventListener('click', () => {
            const passwordInput = document.getElementById(inputId);
            const icon = button.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }
}

setupPasswordToggle(toggleLoginPassword, 'login-password');
setupPasswordToggle(toggleRegisterPassword, 'register-password');
setupPasswordToggle(toggleConfirmPassword, 'register-confirm-password');

// 登录功能
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showToast('请输入用户名和密码', 'error');
        return;
    }

    try {
        // 模拟登录请求
        showLoading(loginBtn, '登录');

        // 实际环境中替换为真实API
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        });

        if (response.ok) {
            const data = await response.json();
            // 存储到会话存储（关闭浏览器后清除）
            sessionStorage.setItem('auth_token', data.access_token);
            sessionStorage.setItem('user_data', JSON.stringify(data.user));
            showToast('登录成功，正在跳转...', 'success');

            // 模拟登录成功后的跳转
            setTimeout(() => {
                window.location.href = '/';
            }, 300);
        } else {
            const error = await response.json();
            showToast(error.error || '登录失败，请检查用户名和密码', 'error');
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        hideLoading(loginBtn, '登录');
    }
});

// 注册功能
registerBtn.addEventListener('click', async () => {
    const full_name = document.getElementById('register-name').value;
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const terms = document.getElementById('terms').checked;

    // 表单验证
    if (!full_name || !username || !email || !password || !confirmPassword) {
        showToast('请填写所有必填字段', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showToast('两次输入的密码不一致', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showToast('请输入有效的电子邮箱地址', 'error');
        return;
    }

    if (!terms) {
        showToast('请同意服务条款和隐私政策', 'error');
        return;
    }

    try {
        // 模拟注册请求
        showLoading(registerBtn, '注册');

        // 实际环境中替换为真实API
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name,
                username,
                email,
                password
            })
        });

        if (response.ok) {
            const data = await response.json();
            showToast('注册成功，请登录', 'success');
            showLoginForm();
        } else {
            const error = await response.json();
            showToast(error.error || '注册失败，请稍后重试', 'error');
        }
    } catch (error) {
        console.error('注册请求失败:', error);
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        hideLoading(registerBtn, '注册');
    }
});

// 邮箱验证工具函数
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 显示加载状态
function showLoading(button, action) {
    button.disabled = true;
    button.innerHTML = `
                <span class="inline-block animate-spin mr-2">
                    <i class="fas fa-circle-notch"></i>
                </span>
                <span>处理中...</span>
            `;
}

// 隐藏加载状态
function hideLoading(button, text) {
    button.disabled = false;
    button.innerHTML = `
                <span>${text}</span>
                <i class="fas fa-${text === '登录' ? 'arrow-right' : 'user-plus'} ml-2"></i>
            `;
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

// 根据URL参数自动切换表单
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('form') === 'register') {
    showRegisterForm();
}