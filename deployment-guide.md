# 部署指南

## 部署方式选择

### 方式一：完整部署（推荐）
包含前端和后端的完整部署，支持所有功能。

### 方式二：纯前端部署
仅部署前端，使用本地存储，适合演示或个人使用。

---

## 方式一：完整部署步骤

### 1. 环境准备
- 确保服务器已安装 Node.js (版本 >= 14)
- 确保服务器有足够的磁盘空间存储数据文件

### 2. 文件上传
将整个项目文件夹上传到服务器，包括：
- 所有 `.js` 文件
- 所有 `.html` 文件
- 所有 `.css` 文件
- `package.json` 和 `package-lock.json`

### 3. 安装依赖
```bash
npm install
```

### 4. 环境变量配置
创建 `.env` 文件（可选）：
```
PORT=3000
NODE_ENV=production
```

### 5. 启动服务

#### 开发模式
```bash
npm start
```

#### 生产模式（推荐使用 PM2）
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "phone-dialer-system"

# 查看状态
pm2 status

# 查看日志
pm2 logs phone-dialer-system
```

### 6. 防火墙配置
确保服务器防火墙允许访问配置的端口（默认 3000）

### 7. 反向代理配置（可选）
如果使用 Nginx 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 常见问题解决

### 连接错误 (ERR_CONNECTION_CLOSED)
1. 检查服务器是否正常运行：访问 `http://your-server:3000/api/health`
2. 检查防火墙设置
3. 确认端口没有被其他程序占用
4. 检查服务器日志：`pm2 logs phone-dialer-system`

### 数据丢失问题
- 数据存储在 `data/` 目录下
- 建议定期备份 `data/` 目录
- 可以设置自动备份脚本

### 性能优化
1. 使用 PM2 集群模式：`pm2 start server.js -i max`
2. 启用 gzip 压缩
3. 配置静态文件缓存

## 监控和维护

### 健康检查
访问 `/api/health` 端点检查服务状态

### 日志管理
```bash
# PM2 日志轮转
pm2 install pm2-logrotate

# 查看实时日志
pm2 logs --lines 100
```

### 数据备份
```bash
# 创建备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$DATE.tar.gz data/
```

---

## 方式二：纯前端部署（Netlify/GitHub Pages）

### 适用场景
- 演示项目
- 个人使用
- 不需要多设备数据同步
- 快速部署测试

### Netlify 部署步骤

1. **准备文件**
   - 确保项目根目录包含所有前端文件
   - `_redirects` 和 `netlify.toml` 已配置

2. **部署到 Netlify**
   - 登录 [Netlify](https://netlify.com)
   - 拖拽项目文件夹到部署区域
   - 或连接 GitHub 仓库自动部署

3. **配置说明**
   - 系统会自动检测到静态部署环境
   - 自动切换到本地存储模式
   - 数据保存在浏览器本地存储中

### GitHub Pages 部署步骤

1. **创建仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/username/repo-name.git
   git push -u origin main
   ```

2. **启用 GitHub Pages**
   - 进入仓库设置
   - 找到 "Pages" 选项
   - 选择 "Deploy from a branch"
   - 选择 "main" 分支

3. **访问应用**
   - 访问 `https://username.github.io/repo-name`
   - 系统自动使用本地存储模式

### 纯前端部署的限制

- **数据存储**：仅保存在浏览器本地存储中
- **数据同步**：无法在不同设备间同步数据
- **数据持久性**：清除浏览器数据会丢失所有信息
- **多用户**：每个浏览器独立存储数据

### 纯前端部署的优势

- **部署简单**：无需服务器配置
- **成本低廉**：大多数静态托管服务免费
- **访问快速**：CDN 加速
- **维护简单**：无需服务器维护

### 从纯前端升级到完整部署

如果后续需要完整功能，可以：
1. 按照"方式一"部署后端服务
2. 修改前端 API 配置指向后端服务器
3. 导出本地存储数据并导入到后端系统