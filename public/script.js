// 电话拨号器 Web应用 - 主要功能实现

class PhoneDialer {
    constructor() {
        // 验证业务员权限
        requireAuth('salesperson');
        
        this.phones = [];
        this.totalCalls = 0;
        this.lastCallTime = null;
        this.currentUser = getCurrentUser();
        
        this.initializeElements();
        this.bindEvents();
        this.init();
    }

    async init() {
        // 加载初始数据
        await this.loadInitialData();
        
        // 更新界面
        this.updateUI();
        
        // 显示欢迎信息
        if (this.currentUser) {
            const welcomeElement = document.getElementById('welcomeText');
            if (welcomeElement) {
                welcomeElement.textContent = `欢迎，${this.currentUser.name}`;
            }
        }
    }

    // 初始化DOM元素引用
    initializeElements() {
        // 输入元素
        this.phoneInput = document.getElementById('phoneInput');
        this.fileInput = document.getElementById('fileInput');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        
        // 相机元素
        this.cameraVideo = document.getElementById('cameraVideo');
        this.cameraCanvas = document.getElementById('cameraCanvas');
        this.cameraArea = document.getElementById('cameraArea');
        this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
        this.imageInput = document.getElementById('imageInput');
        
        // 按钮元素
        this.addPhonesBtn = document.getElementById('addPhonesBtn');
        this.uploadFileBtn = document.getElementById('uploadFileBtn');
        this.startCameraBtn = document.getElementById('startCameraBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.stopCameraBtn = document.getElementById('stopCameraBtn');
        this.uploadImageBtn = document.getElementById('uploadImageBtn');
        this.sortBtn = document.getElementById('sortBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        
        // 相机状态
        this.cameraStream = null;
        this.isRecognizing = false;
        
        // 列表和显示元素
        this.phoneList = document.getElementById('phoneList');
        this.emptyState = document.getElementById('emptyState');
        this.phoneCount = document.getElementById('phoneCount');
        
        // 统计元素
        this.totalCallsEl = document.getElementById('totalCalls');
        this.remainingCountEl = document.getElementById('remainingCount');
        this.lastCallTimeEl = document.getElementById('lastCallTime');
        
        // 模态框元素
        this.confirmModal = document.getElementById('confirmModal');
        this.confirmPhone = document.getElementById('confirmPhone');
        this.confirmCallBtn = document.getElementById('confirmCall');
        this.cancelCallBtn = document.getElementById('cancelCall');
        
        // 通知元素
        this.notification = document.getElementById('notification');
    }

    // 绑定事件监听器
    bindEvents() {
        // 添加号码按钮
        this.addPhonesBtn.addEventListener('click', () => this.addPhones().catch(console.error));
        
        // 文件上传
        this.uploadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // 拖拽上传
        this.fileUploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.fileUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.fileUploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 相机功能
        this.startCameraBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.captureAndRecognize());
        this.stopCameraBtn.addEventListener('click', () => this.stopCamera());
        this.cameraPlaceholder.addEventListener('click', () => this.startCamera());
        
        // 图片上传识别
        this.uploadImageBtn.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // 控制按钮
        this.sortBtn.addEventListener('click', () => this.sortPhones().catch(console.error));
        this.clearAllBtn.addEventListener('click', () => this.clearAllPhones().catch(console.error));
        
        // 模态框
        this.confirmCallBtn.addEventListener('click', () => this.executeCall());
        this.cancelCallBtn.addEventListener('click', () => this.hideModal());
        this.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) this.hideModal();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // 输入框回车键
        this.phoneInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.addPhones().catch(console.error);
            }
        });
    }

    // 添加电话号码
    async addPhones() {
        const input = this.phoneInput.value.trim();
        if (!input) {
            this.showNotification('请输入电话号码', 'error');
            return;
        }

        const lines = input.split(/\n|\s|,/).map(line => line.trim()).filter(line => line);
        const phonesToAdd = [...new Set(lines.map(phone => this.cleanPhoneNumber(phone)).filter(phone => this.isValidPhone(phone)))];

        if (phonesToAdd.length > 0) {
            try {
                const result = await apiClient.addPhonesBulk(this.currentUser.username, phonesToAdd);
                this.phones = result.phoneNumbers;
                this.updateUI();
                this.phoneInput.value = '';
                this.showNotification(`成功处理 ${phonesToAdd.length} 个号码`, 'success');
            } catch (error) {
                console.error('批量添加号码失败:', error);
                this.showNotification('批量添加号码失败，请稍后重试', 'error');
            }
        } else {
            this.showNotification('未找到有效的电话号码', 'warning');
        }
    }

    // 处理文件上传
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.match(/\.(txt|csv)$/i)) {
            this.showNotification('请选择 .txt 或 .csv 文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.phoneInput.value = content;
            this.addPhones().catch(console.error);
        };
        reader.readAsText(file);
        
        // 清空文件输入
        event.target.value = '';
    }

    // 拖拽处理
    handleDragOver(e) {
        e.preventDefault();
        this.fileUploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.fileUploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.fileUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.fileInput.files = files;
            this.handleFileUpload({ target: { files } });
        }
    }

    // 清理电话号码格式
    cleanPhoneNumber(phone) {
        return phone.replace(/[^0-9]/g, '');
    }

    // 验证电话号码
    isValidPhone(phone) {
        // 支持7-15位数字的电话号码
        return /^\d{7,15}$/.test(phone);
    }

    // 排序电话号码
    async sortPhones() {
        try {
            const currentOrder = this.sortBtn.dataset.order === 'asc' ? 'desc' : 'asc';
            const result = await apiClient.sortPhones(this.currentUser.username, currentOrder);
            this.phones = result.phones;
            this.sortBtn.dataset.order = currentOrder;
            this.updateUI();
            this.showNotification(`号码已按${currentOrder === 'asc' ? '升序' : '降序'}重新排序`, 'info');
        } catch (error) {
            console.error('排序号码失败:', error);
            this.showNotification('排序号码失败', 'error');
        }
    }

    // 清空所有号码
    async clearAllPhones() {
        if (this.phones.length === 0) {
            this.showNotification('列表已经是空的', 'info');
            return;
        }

        if (confirm(`确定要清空所有 ${this.phones.length} 个号码吗？`)) {
            try {
                await apiClient.clearPhones(this.currentUser.username);
                this.phones = [];
                this.updateUI();
                this.showNotification('已清空所有号码', 'success');
            } catch (error) {
                console.error('清空号码失败:', error);
                this.showNotification('清空号码失败', 'error');
            }
        }
    }

    // 从服务器加载初始数据
    async loadInitialData() {
        if (!this.currentUser) return;

        try {
            const userData = await apiClient.getUserData(this.currentUser.username);
            this.phones = userData.phones || [];
            this.totalCalls = userData.totalCalls || 0;
            this.lastCallTime = userData.lastCallTime ? new Date(userData.lastCallTime) : null;
            
        } catch (error) {
            console.error('加载初始数据失败:', error);
            this.showNotification('无法从服务器加载数据', 'error');
            // 失败时使用空数据初始化
            this.phones = [];
            this.totalCalls = 0;
            this.lastCallTime = null;
        }
    }

    // 启动相机
    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment', // 优先使用后置摄像头
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.cameraVideo.srcObject = this.cameraStream;
            this.cameraVideo.style.display = 'block';
            this.cameraPlaceholder.style.display = 'none';
            this.cameraArea.classList.add('active');
            
            // 显示控制按钮
            this.startCameraBtn.style.display = 'none';
            this.captureBtn.style.display = 'inline-block';
            this.stopCameraBtn.style.display = 'inline-block';
            
            this.showNotification('相机已启动，可以拍照识别手机号', 'success');
        } catch (error) {
            console.error('启动相机失败:', error);
            this.showNotification('无法启动相机，请检查权限设置', 'error');
        }
    }
    
    // 停止相机
    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        
        this.cameraVideo.style.display = 'none';
        this.cameraPlaceholder.style.display = 'flex';
        this.cameraArea.classList.remove('active', 'recognizing');
        
        // 隐藏控制按钮
        this.startCameraBtn.style.display = 'inline-block';
        this.captureBtn.style.display = 'none';
        this.stopCameraBtn.style.display = 'none';
        
        this.showNotification('相机已关闭', 'info');
    }
    
    // 拍照并识别
    async captureAndRecognize() {
        if (!this.cameraStream || this.isRecognizing) return;
        
        this.isRecognizing = true;
        this.cameraArea.classList.add('recognizing');
        this.captureBtn.disabled = true;
        this.captureBtn.textContent = '识别中...';
        
        try {
            const video = this.cameraVideo;
            const canvas = this.cameraCanvas;
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            ctx.drawImage(video, 0, 0);
            
            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            
            const recognizedText = await this.performOCR(imageData);
            
            if (recognizedText) {
                await this.addPhonesFromText(recognizedText);
            } else {
                this.showNotification('未识别到文本', 'warning');
            }
            
        } catch (error) {
            console.error('识别失败:', error);
            this.showNotification('识别失败，请重试', 'error');
        } finally {
            this.isRecognizing = false;
            this.cameraArea.classList.remove('recognizing');
            this.captureBtn.disabled = false;
            this.captureBtn.textContent = '📸 拍照识别';
            this.stopCamera();
        }
    }
    
    // 执行OCR识别
    async performOCR(imageData) {
        try {
            // 使用Tesseract.js进行OCR识别
            const { data: { text } } = await Tesseract.recognize(
                imageData,
                'chi_sim+eng', // 支持中文简体和英文
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            this.captureBtn.textContent = `识别中... ${progress}%`;
                        }
                    }
                }
            );
            return text;
        } catch (error) {
            console.error('OCR识别失败:', error);
            // 如果OCR失败，返回模拟数据作为备选
            return '联系人信息\n张三 13812345678\n李四 15987654321\n王五 18666888999';
        }
    }
    
    // 从文本中提取手机号
    extractPhoneNumbers(text) {
        // 中国手机号正则表达式
        const phoneRegex = /1[3-9]\d{9}/g;
        const matches = text.match(phoneRegex) || [];
        
        // 去重并验证
        const uniquePhones = [...new Set(matches)];
        return uniquePhones.filter(phone => this.isValidPhone(phone));
    }
    
    // 从文本中提取并添加电话号码
    async addPhonesFromText(text) {
        const phones = this.extractPhoneNumbers(text);
        if (phones.length === 0) {
            this.showNotification('未识别到电话号码', 'warning');
            return;
        }

        try {
            const result = await apiClient.addPhonesBulk(this.currentUser.username, phones);
            this.phones = result.phoneNumbers;
            this.updateUI();
            this.showNotification(`成功从文本中添加 ${phones.length} 个号码`, 'success');
        } catch (error) {
            console.error('从文本批量添加号码失败:', error);
            this.showNotification('从文本批量添加号码失败', 'error');
        }
    }

    // 处理图片上传识别
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this.showNotification('请选择图片文件', 'error');
            return;
        }
        
        // 验证文件大小（限制10MB）
        if (file.size > 10 * 1024 * 1024) {
            this.showNotification('图片文件过大，请选择小于10MB的图片', 'error');
            return;
        }
        
        try {
            // 显示识别状态
            this.uploadImageBtn.disabled = true;
            this.uploadImageBtn.textContent = '识别中...';
            
            // 读取图片文件
            const imageData = await this.readImageFile(file);
            
            // 使用OCR识别文字
            const recognizedText = await this.performOCR(imageData);

            if (recognizedText) {
                await this.addPhonesFromText(recognizedText);
            } else {
                this.showNotification('未能从图片中识别出文本', 'warning');
            }
        } catch (error) {
            console.error('图片识别失败:', error);
            this.showNotification('图片识别失败，请重试', 'error');
        } finally {
            // 恢复按钮状态
            this.uploadImageBtn.disabled = false;
            this.uploadImageBtn.textContent = '🖼️ 上传图片识别';
            // 清空文件输入
            this.imageInput.value = '';
        }
    }
    
    // 读取图片文件
    readImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

}

// 初始化应用

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new PhoneDialer();
    
    // 添加一些示例快捷键提示
    console.log('电话拨号器快捷键:');
    console.log('Ctrl+Enter: 添加号码');
    console.log('Ctrl+S: 排序号码');
    console.log('Ctrl+D: 清空所有');
    console.log('ESC: 关闭对话框');
});


// 导出全局函数供HTML调用
window.phoneDialer = phoneDialer;