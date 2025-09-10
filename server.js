const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// 中间件
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key', // 生产环境中应使用更安全的密钥
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // 生产环境中应为 true
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}));
app.use(express.static('.'));

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// 读取JSON文件
async function readJsonFile(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null; // 文件不存在
        }
        throw error;
    }
}

// 写入JSON文件
async function writeJsonFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// 初始化默认数据
async function initializeData() {
    await ensureDataDir();
    
    // 初始化用户数据
    const users = await readJsonFile('users.json');
    if (!users) {
        const defaultUsers = {
            'admin': { password: 'admin123', role: 'admin', name: '系统管理员' },
            'sales1': { password: 'sales123', role: 'salesperson', name: '业务员1' },
            'sales2': { password: 'sales123', role: 'salesperson', name: '业务员2' },
            'sales3': { password: 'sales123', role: 'salesperson', name: '业务员3' }
        };
        await writeJsonFile('users.json', defaultUsers);
    }
    
    // 初始化号码池
    const phonePool = await readJsonFile('phonePool.json');
    if (!phonePool) {
        await writeJsonFile('phonePool.json', []);
    }
    
    // 初始化分配记录
    const assignments = await readJsonFile('assignments.json');
    if (!assignments) {
        await writeJsonFile('assignments.json', {});
    }
    
    // 初始化用户数据
    const userData = await readJsonFile('userData.json');
    if (!userData) {
        await writeJsonFile('userData.json', {});
    }
}

// API路由

// 用户认证
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const users = await readJsonFile('users.json');
        
        if (users[username] && users[username].password === password && users[username].role === role) {
            const user = {
                username,
                role,
                name: users[username].name
            };
            req.session.user = user; // 在会话中存储用户信息
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: '用户名、密码或角色不正确' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 用户登出
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: '登出失败' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

// 检查会话状态
app.get('/api/auth/session', (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json(null);
    }
});

// 认证中间件
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: '需要认证' });
    }
}

// 获取用户列表
app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const users = await readJsonFile('users.json');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: '获取用户列表失败' });
    }
});

// 更新用户
app.put('/api/users', requireAuth, async (req, res) => {
    try {
        const users = req.body;
        await writeJsonFile('users.json', users);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新用户失败' });
    }
});

// 获取号码池
app.get('/api/phonePool', requireAuth, async (req, res) => {
    try {
        const phonePool = await readJsonFile('phonePool.json');
        res.json(phonePool || []);
    } catch (error) {
        res.status(500).json({ error: '获取号码池失败' });
    }
});

// 更新号码池
app.put('/api/phonePool', requireAuth, async (req, res) => {
    try {
        const phonePool = req.body;
        await writeJsonFile('phonePool.json', phonePool);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新号码池失败' });
    }
});

// 获取分配记录
app.get('/api/assignments', requireAuth, async (req, res) => {
    try {
        const assignments = await readJsonFile('assignments.json');
        res.json(assignments || {});
    } catch (error) {
        res.status(500).json({ error: '获取分配记录失败' });
    }
});

// 更新分配记录
app.put('/api/assignments', requireAuth, async (req, res) => {
    try {
        const assignments = req.body;
        await writeJsonFile('assignments.json', assignments);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新分配记录失败' });
    }
});

// 获取用户数据（拨号记录等）
app.get('/api/userData/:username', requireAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const userData = await readJsonFile('userData.json');
        res.json(userData[username] || { phones: [], totalCalls: 0, lastCallTime: null });
    } catch (error) {
        res.status(500).json({ error: '获取用户数据失败' });
    }
});

// 更新用户数据
app.put('/api/userData/:username', requireAuth, async (req, res) => {
    try {
        const { username } = req.params;
        const newData = req.body;
        const userData = await readJsonFile('userData.json') || {};
        userData[username] = newData;
        await writeJsonFile('userData.json', userData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: '更新用户数据失败' });
    }
});

// 清空所有数据
app.delete('/api/data/clear', requireAuth, async (req, res) => {
    try {
        const files = ['users.json', 'phonePool.json', 'assignments.json', 'userData.json'];
        for (const file of files) {
            const filePath = path.join(DATA_DIR, file);
            try {
                await fs.unlink(filePath);
            } catch (error) {
                // 忽略文件不存在的错误
            }
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        port: PORT,
        dataDir: DATA_DIR
    });
});

// 启动服务器
async function startServer() {
    await initializeData();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log('数据存储目录:', DATA_DIR);
        console.log('服务器监听所有网络接口');
    });
}

// 只有在直接运行时才启动服务器
if (require.main === module) {
    startServer().catch(console.error);
}

// 导出 app 和 initializeData 供无服务器函数使用
module.exports = { app, initializeData };