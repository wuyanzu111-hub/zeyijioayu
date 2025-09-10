// 管理员控制台
class AdminPanel {
    constructor() {
        this.phonePool = [];
        this.users = {};
        this.assignments = {};
        this.init();
    }
    
    async init() {
        // 验证管理员权限
        if (!requireAuth('admin')) {
            return;
        }
        
        // 初始化用户信息
        await this.loadUsers();
        await this.loadPhonePool();
        await this.loadAssignments();
        
        // 绑定事件
        this.bindEvents();
        
        // 更新界面
        this.updateUI();
        
        // 显示欢迎信息
        const currentUser = getCurrentUser();
        if (currentUser) {
            document.getElementById('welcomeText').textContent = `欢迎，${currentUser.name}`;
        }
    }
    
    bindEvents() {
        // 文件上传
        const fileInput = document.getElementById('phoneFileInput');
        fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // 拖拽上传
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        
        // 按钮事件
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('phoneFileInput').click();
        });
        
        document.getElementById('distributeBtn').addEventListener('click', () => {
            this.distributePhones();
        });
        
        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllData();
        });
        
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showAddUserModal();
        });
        
        // 添加用户表单
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            this.handleAddUser(e);
        });
        
        // 图片预览相关事件
        document.getElementById('confirmOCR').addEventListener('click', () => {
            this.confirmImageOCR();
        });
        
        document.getElementById('cancelPreview').addEventListener('click', () => {
            this.cancelImagePreview();
        });
    }
    
    async loadUsers() {
        try {
            this.users = await apiClient.getUsers();
        } catch (error) {
            console.error('加载用户失败:', error);
            this.showNotification('无法从服务器加载用户列表', 'error');
            this.users = {}; // 出错时设置为空
        }
    }
    
    async saveUsers() {
        try {
            await apiClient.updateUsers(this.users);
        } catch (error) {
            console.error('保存用户失败:', error);
        }
    }
    
    async loadPhonePool() {
        try {
            this.phonePool = await apiClient.getPhonePool();
        } catch (error) {
            console.error('加载号码池失败:', error);
            this.showNotification('无法从服务器加载号码池', 'error');
            this.phonePool = [];
        }
    }
    
    async savePhonePool() {
        try {
            await apiClient.updatePhonePool(this.phonePool);
        } catch (error) {
            console.error('保存号码池失败:', error);
        }
    }
    
    async loadAssignments() {
        try {
            this.assignments = await apiClient.getAssignments();
        } catch (error) {
            console.error('加载分配记录失败:', error);
            this.showNotification('无法从服务器加载分配记录', 'error');
            this.assignments = {};
        }
    }
    
    async saveAssignments() {
        try {
            await apiClient.updateAssignments(this.assignments);
        } catch (error) {
            console.error('保存分配记录失败:', error);
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    processFile(file) {
        // 支持文本文件和图片文件
        if (file.name.match(/\.(txt|csv)$/i)) {
            this.processTextFile(file);
        } else if (file.name.match(/\.(jpg|jpeg|png|bmp|gif|webp)$/i)) {
            this.processImageFile(file);
        } else {
            this.showNotification('请选择文本文件(.txt, .csv)或图片文件(.jpg, .png等)', 'error');
            return;
        }
    }
    
    processTextFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.parsePhoneNumbers(content);
        };
        reader.readAsText(file);
    }
    
    processImageFile(file) {
        // 存储当前文件以供后续处理
        this.currentImageFile = file;
        
        // 显示图片预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            this.showImagePreview(imageData);
        };
        reader.readAsDataURL(file);
    }
    
    showImagePreview(imageData) {
        const previewContainer = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');
        
        previewImage.src = imageData;
        previewContainer.style.display = 'block';
        
        // 存储图片数据以供OCR使用
        this.currentImageData = imageData;
    }
    
    confirmImageOCR() {
        if (this.currentImageData) {
            this.showNotification('正在识别图片中的电话号码，请稍候...', 'info');
            this.performOCR(this.currentImageData);
            this.cancelImagePreview();
        }
    }
    
    cancelImagePreview() {
        const previewContainer = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');
        
        previewContainer.style.display = 'none';
        previewImage.src = '';
        
        // 清理存储的数据
        this.currentImageFile = null;
        this.currentImageData = null;
        
        // 重置文件输入
        document.getElementById('phoneFileInput').value = '';
    }
    
    async performOCR(imageData) {
        try {
            // 使用Tesseract.js进行OCR识别
            const worker = await Tesseract.createWorker('chi_sim+eng');
            
            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();
            
            // 从识别的文本中提取电话号码
            this.parsePhoneNumbers(text);
            
        } catch (error) {
            console.error('OCR识别失败:', error);
            this.showNotification('图片识别失败，请尝试上传更清晰的图片或使用文本文件', 'error');
        }
    }
    
    parsePhoneNumbers(content) {
        const newPhones = [];
        
        // 多种电话号码正则表达式模式
        const phonePatterns = [
            // 中国手机号码 (11位)
            /1[3-9]\d{9}/g,
            // 带分隔符的手机号码
            /1[3-9]\d[\s\-]?\d{4}[\s\-]?\d{4}/g,
            // 固定电话 (带区号)
            /0\d{2,3}[\s\-]?\d{7,8}/g,
            // 400/800电话
            /[48]00[\s\-]?\d{3}[\s\-]?\d{4}/g,
            // 国际格式 (+86)
            /\+86[\s\-]?1[3-9]\d{9}/g,
            // 通用数字串 (10-15位)
            /\b\d{10,15}\b/g
        ];
        
        // 使用所有模式匹配电话号码
        phonePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
                // 清理号码，只保留数字
                const cleanPhone = match.replace(/[^0-9]/g, '');
                
                // 验证号码有效性
                if (this.isValidPhoneNumber(cleanPhone)) {
                    if (!this.phonePool.includes(cleanPhone) && !newPhones.includes(cleanPhone)) {
                        newPhones.push(cleanPhone);
                    }
                }
            });
        });
        
        // 按行分割，寻找可能遗漏的号码
        const lines = content.split(/[\n\r]+/);
        lines.forEach(line => {
            // 提取行中的所有数字序列
            const digitSequences = line.match(/\d+/g) || [];
            digitSequences.forEach(seq => {
                if (this.isValidPhoneNumber(seq)) {
                    if (!this.phonePool.includes(seq) && !newPhones.includes(seq)) {
                        newPhones.push(seq);
                    }
                }
            });
        });
        
        if (newPhones.length > 0) {
            this.phonePool.push(...newPhones);
            this.savePhonePool().catch(err => {
                console.error('保存号码池失败:', err);
                this.showNotification('保存号码池失败，请重试', 'error');
            });
            this.updateUI();
            this.showNotification(`成功识别并添加 ${newPhones.length} 个电话号码`, 'success');
        } else {
            this.showNotification('未找到有效的电话号码，请检查图片清晰度或文件格式', 'error');
        }
    }
    
    isValidPhoneNumber(phone) {
        // 基本长度检查
        if (phone.length < 10 || phone.length > 15) {
            return false;
        }
        
        // 中国手机号码验证 (11位，以1开头)
        if (phone.length === 11 && phone.startsWith('1')) {
            const secondDigit = phone.charAt(1);
            return ['3', '4', '5', '6', '7', '8', '9'].includes(secondDigit);
        }
        
        // 固定电话验证 (以0开头)
        if (phone.startsWith('0') && phone.length >= 10 && phone.length <= 12) {
            return true;
        }
        
        // 400/800电话
        if ((phone.startsWith('400') || phone.startsWith('800')) && phone.length === 10) {
            return true;
        }
        
        // 其他10-15位数字（可能是国际号码）
        if (phone.length >= 10 && phone.length <= 15) {
            // 排除明显无效的号码（如全是相同数字）
            const uniqueDigits = new Set(phone).size;
            return uniqueDigits > 2; // 至少包含3种不同数字
        }
        
        return false;
    }
    
    async distributePhones() {
        const salespeople = Object.keys(this.users).filter(username => 
            this.users[username].role === 'salesperson'
        );
        
        if (salespeople.length === 0) {
            this.showNotification('没有业务员账户可以分配号码', 'error');
            return;
        }
        
        if (this.phonePool.length === 0) {
            this.showNotification('号码池为空，请先上传号码', 'error');
            return;
        }
        
        // 清空之前的分配
        this.assignments = {};
        
        // 随机打乱号码池
        const shuffledPhones = [...this.phonePool].sort(() => Math.random() - 0.5);

        // 平均分配
        const phonesPerPerson = Math.floor(shuffledPhones.length / salespeople.length);
        const remainder = shuffledPhones.length % salespeople.length;
        
        let phoneIndex = 0;
        salespeople.forEach((username, index) => {
            const phoneCount = phonesPerPerson + (index < remainder ? 1 : 0);
            this.assignments[username] = shuffledPhones.slice(phoneIndex, phoneIndex + phoneCount);
            phoneIndex += phoneCount;
        });

        await this.saveAssignments();
        this.updateUI();

        const totalAssigned = Object.values(this.assignments).reduce((sum, phones) => sum + phones.length, 0);
        this.showNotification(`成功分配 ${totalAssigned} 个号码给 ${salespeople.length} 个业务员`, 'success');
    }
    
    async clearAllData() {
        if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
            try {
                await apiClient.clearAllData();
                // 重新加载数据以同步状态
                await this.loadPhonePool();
                await this.loadAssignments();
                this.updateUI();
                this.showNotification('所有数据已清空', 'success');
            } catch (error) {
                console.error('清空数据失败:', error);
                this.showNotification('清空数据失败，请重试', 'error');
            }
        }
    }
    
    showAddUserModal() {
        document.getElementById('addUserModal').style.display = 'block';
    }
    
    handleAddUser(e) {
        e.preventDefault();
        
        const username = document.getElementById('newUsername').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newUserRole').value;
        const name = document.getElementById('newUserName').value.trim();
        
        if (this.users[username]) {
            this.showNotification('用户名已存在', 'error');
            return;
        }
        
        this.users[username] = { password, role, name };
        this.saveUsers();
        this.updateUI();
        this.closeAddUserModal();
        this.showNotification(`用户 ${name} 添加成功`, 'success');
    }
    
    deleteUser(username) {
        if (username === 'admin') {
            this.showNotification('不能删除管理员账户', 'error');
            return;
        }
        
        if (confirm(`确定要删除用户 ${this.users[username].name} 吗？`)) {
            delete this.users[username];
            // 在分配记录中也删除该用户
            if (this.assignments[username]) {
                delete this.assignments[username];
            }
            this.saveUsers();
            this.saveAssignments();
            this.updateUI();
            this.showNotification('用户删除成功', 'success');
        }
    }
    
    updateUI() {
        this.updatePhonePool();
        this.updateUsersList();
        this.updateStats();
    }
    
    updatePhonePool() {
        const content = document.getElementById('phonePoolContent');
        const totalElement = document.getElementById('totalPhones');
        
        totalElement.textContent = this.phonePool.length;
        
        if (this.phonePool.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <i>📞</i>
                    <p>暂无号码，请先上传号码文件</p>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="phone-grid">
                    ${this.phonePool.map(phone => `<div class="phone-item">${phone}</div>`).join('')}
                </div>
            `;
        }
    }
    
    updateUsersList() {
        const container = document.getElementById('usersList');
        const userEntries = Object.entries(this.users);
        
        container.innerHTML = userEntries.map(([username, user]) => {
            const assignedCount = this.assignments[username] ? this.assignments[username].length : 0;
            const isOnline = username === getCurrentUser()?.username;
            
            return `
                <div class="user-item">
                    <div class="user-name" data-label="用户名">${user.name} (${username})</div>
                    <div class="user-role" data-label="角色">${user.role === 'admin' ? '管理员' : '业务员'}</div>
                    <div class="user-phones" data-label="分配号码">${assignedCount}</div>
                    <div class="user-status" data-label="状态">
                        <span class="${isOnline ? 'status-online' : 'status-offline'}">
                            ${isOnline ? '在线' : '离线'}
                        </span>
                    </div>
                    <div class="user-actions" data-label="操作">
                        ${username !== 'admin' ? `
                            <button class="btn btn-danger" onclick="adminPanel.deleteUser('${username}')">删除</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateStats() {
        const totalPhones = this.phonePool.length;
        const distributedPhones = Object.values(this.assignments).reduce((sum, phones) => sum + phones.length, 0);
        const activeUsers = Object.keys(this.users).filter(username => this.users[username].role === 'salesperson').length;
        
        document.getElementById('totalPhonesCount').textContent = totalPhones;
        document.getElementById('distributedCount').textContent = distributedPhones;
        document.getElementById('activeUsersCount').textContent = activeUsers;
    }
    
    closeAddUserModal() {
        document.getElementById('addUserModal').style.display = 'none';
        document.getElementById('addUserForm').reset();
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

// 全局函数
function closeAddUserModal() {
    adminPanel.closeAddUserModal();
}

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
    const modal = document.getElementById('addUserModal');
    if (e.target === modal) {
        closeAddUserModal();
    }
});

// 初始化管理员面板
const adminPanel = new AdminPanel();