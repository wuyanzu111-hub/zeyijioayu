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

app.use(express.static(path.join(__dirname)));

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
        console.error('获取用户列表失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 获取用户的完整电话列表（合并分配的和个人的）
app.get('/api/users/:username/phones', async (req, res) => {
    const { username } = req.params;
    try {
        const [users, allAssignments] = await Promise.all([
            readData('users'),
            readData('assignments')
        ]);

        const user = users.find(u => u.username === username);
        const assignedPhones = allAssignments[username] || [];

        if (!user) {
            // 如果用户不存在，但有分配给他的号码，则只返回分配的号码
            return res.json({ phones: [...new Set(assignedPhones)] });
        }

        const userPhones = user.phones || [];
        const mergedPhones = [...new Set([...assignedPhones, ...userPhones])];
        
        res.json({ phones: mergedPhones });

    } catch (error) {
        console.error('获取用户电话时出错:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 排序用户的电话号码
app.put('/api/users/:username/phones/sort', async (req, res) => {
    const { username } = req.params;
    const { order = 'asc' } = req.body; // 默认为升序

    try {
        const users = await readData('users');
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 确保 phones 数组存在
        if (!users[userIndex].phones) {
            users[userIndex].phones = [];
        }

        // 排序电话号码
        users[userIndex].phones.sort((a, b) => {
            const numA = parseInt(a, 10);
            const numB = parseInt(b, 10);
            return order === 'asc' ? numA - numB : numB - numA;
        });

        await writeData('users', users);

        res.json({ message: '电话号码已排序', phones: users[userIndex].phones });
    } catch (error) {
        console.error('排序电话号码时出错:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 获取所有用户
app.get('/api/users', async (req, res) => {
    try {
        const users = await readJsonFile('users.json');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: '获取用户列表失败' });
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