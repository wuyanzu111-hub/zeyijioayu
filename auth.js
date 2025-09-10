// 用户认证系统
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkLoginStatus();

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async checkLoginStatus() {
        // 在登录页面，不主动检查会话，避免不必要的重定向
        if (window.location.pathname.includes('login.html')) {
            return;
        }

        try {
            const user = await apiClient.checkSession();
            if (user) {
                this.currentUser = user;
            } else {
                this.handleLogout();
            }
        } catch (error) {
            console.error('检查会话失败:', error);
            this.handleLogout();
        }
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;

        if (!username || !password || !role) {
            this.showNotification('请填写完整的登录信息', 'error');
            return;
        }

        try {
            const result = await apiClient.login(username, password, role);

            if (result.success) {
                this.currentUser = result.user;
                this.showNotification('登录成功！', 'success');
                setTimeout(() => {
                    this.redirectToApp();
                }, 1000);
            } else {
                this.showNotification(result.message || '用户名、密码或角色不正确', 'error');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            this.showNotification('登录失败，请检查网络连接或服务器状态', 'error');
        }
    }

    redirectToApp() {
        if (this.currentUser.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    async logout() {
        try {
            await apiClient.logout();
        } catch (error) {
            console.error('登出失败:', error);
        }
        this.handleLogout();
    }

    handleLogout() {
        this.currentUser = null;
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    requireAuth(requiredRole = null) {
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return false;
        }

        if (requiredRole && this.currentUser.role !== requiredRole) {
            this.showNotification('权限不足', 'error');
            // 可以选择重定向到无权限页面或首页
            // window.location.href = 'index.html'; 
            return false;
        }

        return true;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 初始化认证系统
const auth = new AuthSystem();

// 全局函数
function logout() {
    auth.logout();
}

function getCurrentUser() {
    return auth.getCurrentUser();
}

function requireAuth(role = null) {
    return auth.requireAuth(role);
}