// API工具类 - 处理与后端服务器的通信
class ApiClient {
    constructor() {
        this.baseUrl = this.getApiBaseUrl();
    }

    // 获取API基础URL
    getApiBaseUrl() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
            return `${protocol}//${hostname}:3000/api`;
        }

        if (hostname.includes('netlify.app') || hostname.includes('github.io')) {
            return '/api';
        }

        return `${protocol}//${hostname}/api`;
    }

    // 通用请求方法
    async request(url, options = {}) {
        try {
            const response = await fetch(this.baseUrl + url, {
                credentials: 'include', // 确保跨域请求时携带cookie
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    // 用户认证
    async login(username, password, role) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
    }

    // 用户登出
    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    }

    // 检查会话状态
    async checkSession() {
        return this.request('/auth/session');
    }

    // 获取用户列表
    async getUsers() {
        return this.request('/users');
    }

    // 更新用户列表
    async updateUsers(users) {
        return this.request('/users', {
            method: 'PUT',
            body: JSON.stringify(users)
        });
    }

    // 获取号码池
    async getPhonePool() {
        return this.request('/phonePool');
    }

    // 更新号码池
    async updatePhonePool(phonePool) {
        return this.request('/phonePool', {
            method: 'PUT',
            body: JSON.stringify(phonePool)
        });
    }

    // 获取分配记录
    async getAssignments() {
        return this.request('/assignments');
    }

    // 更新分配记录
    async updateAssignments(assignments) {
        return this.request('/assignments', {
            method: 'PUT',
            body: JSON.stringify(assignments)
        });
    }

    // 获取用户数据
    async getUserData(username) {
        const userData = await this.request(`/userData/${username}`);
        const userPhones = await this.request(`/api/users/${username}/phones`);
        return { ...userData, phones: userPhones.phones };
    },

    // 更新用户数据
    async updateUserData(username, data) {
        return this.request(`/api/users/${username}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // 添加单个电话号码
    async addPhone(username, phone) {
        return this.request(`/api/users/${username}/phones`, {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
    },

    // 批量添加电话号码
    async addPhonesBulk(username, phones) {
        return this.request(`/api/users/${username}/phones/bulk`, {
            method: 'POST',
            body: JSON.stringify({ phones })
        });
    },

    // 删除单个电话号码
    async deletePhone(username, phone) {
        return this.request(`/api/users/${username}/phones/${phone}`, {
            method: 'DELETE'
        });
    },

    // 清空所有电话号码
    async clearPhones(username) {
        return this.request(`/api/users/${username}/phones`, {
            method: 'DELETE'
        });
    },

    // 排序电话号码
    async sortPhones(username, order = 'asc') {
        return this.request(`/api/users/${username}/phones/sort`, {
            method: 'PUT',
            body: JSON.stringify({ order })
        });
    },

    // 获取号码池
    async getPhonePool() {
        return this.request('/phonePool');
    }

    // 清空所有数据
    async clearAllData() {
        return this.request('/data/clear', {
            method: 'DELETE'
        });
    }
}

// 创建全局API客户端实例
const apiClient = new ApiClient();