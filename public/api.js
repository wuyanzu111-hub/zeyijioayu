class API {
    constructor() {
        this.baseUrl = \'\'; // The base URL is the same as the frontend
    }

    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;
        const headers = {
            \'Content-Type\': \'application/json\',
            ...options.headers,
        };

        const token = localStorage.getItem(\'token\');
        if (token) {
            headers[\'Authorization\'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || \'请求失败\');
            }
            if (response.status === 204) {
                return null;
            }
            return response.json();
        } catch (error) {
            console.error(\'API request error:\', error);
            throw error;
        }
    }

    // Auth
    login(username, password) {
        return this.request(\'/api/auth/login\', {
            method: \'POST\',
            body: JSON.stringify({ username, password }),
        });
    }

    logout() {
        return this.request(\'/api/auth/logout\', { method: \'POST\' });
    }

    // Users
    getUsers() {
        return this.request(\'/api/users\');
    }

    createUser(username, password, role) {
        return this.request(\'/api/users\', {
            method: \'POST\',
            body: JSON.stringify({ username, password, role }),
        });
    }

    updateUser(id, data) {
        return this.request(`/api/users/${id}`, {
            method: \'PUT\',
            body: JSON.stringify(data),
        });
    }

    deleteUser(id) {
        return this.request(`/api/users/${id}`, { method: \'DELETE\' });
    }

    // Phone Pool
    getPhonePool() {
        return this.request(\'/api/phone-pool\');
    }

    addPhoneNumber(phoneNumber) {
        return this.request(\'/api/phone-pool\', {
            method: \'POST\',
            body: JSON.stringify({ phoneNumber }),
        });
    }

    deletePhoneNumber(phoneNumber) {
        return this.request(`/api/phone-pool\`, {
            method: \'DELETE\',
            body: JSON.stringify({ phoneNumber }),
        });
    }

    // Assignments
    getAssignments() {
        return this.request(\'/api/assignments\');
    }

    assignNumber(userId) {
        return this.request(\'/api/assignments\', {
            method: \'POST\',
            body: JSON.stringify({ userId }),
        });
    }

    releaseNumber(userId, phoneNumber) {
        return this.request(\'/api/assignments/release\', {
            method: \'POST\',
            body: JSON.stringify({ userId, phoneNumber }),
        });
    }
}

const api = new API();