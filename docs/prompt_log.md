# Prompt 日志

> 本文档记录了项目开发过程中使用 AI 编程工具（CodeBuddy/Cursor）的关键 Prompt 及 AI 返回的原始输出。
> 每条 Prompt 标注了对应的功能模块和涉及文件，并附带了 AI 生成的原始代码块，便于对照代码审查。

---

## 1. 项目初始化与用户认证系统

### 1.1 初始化 Next.js + Flask 全栈项目

**Prompt:**
```
创建一个团队协作平台全栈项目：
- 前端用 Next.js 14 + TypeScript + Tailwind CSS
- 后端用 Python Flask + SQLAlchemy + JWT 认证
- 数据库使用 SQLite
- 先搭建用户注册和登录功能
```

**对应功能:** 项目骨架搭建
**涉及文件:** `backend/app.py`, `src/app/`, `package.json`

**AI 原始输出（关键代码）:**

后端主入口 `backend/app.py`（认证部分）：
```python
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import re

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///data.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app, supports_credentials=True)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
```

前端 API 封装 `src/lib/api.ts`（核心结构）：
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  const data = await res.json();
  return data;
}
```

前端 `package.json`（依赖）：
```json
{
  "dependencies": {
    "next": "14.2.35",
    "react": "^18",
    "react-dom": "^18",
    "next-themes": "^0.4.6"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/node": "^20",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "eslint": "^8",
    "eslint-config-next": "14.2.35"
  }
}
```

---

### 1.2 实现 JWT 双 Token 认证

**Prompt:**
```
实现 JWT 认证系统：
1. 注册接口：用户名 + 邮箱 + 密码，密码用 bcrypt 哈希
2. 登录接口：返回 access_token (24h) 和 refresh_token (30天)
3. 刷新 Token 接口
4. 获取当前用户信息接口 (/api/auth/me)
5. 登录失败限流（10次/分钟）
```

**对应功能:** 用户认证 API
**涉及文件:** `backend/app.py`（认证路由部分）、`backend/app/routes/auth.py`

**AI 原始输出（关键代码）:**

```python
# 登录速率限制
LOGIN_ATTEMPTS = {}

def rate_limit(f):
    def decorated(*args, **kwargs):
        ip = request.remote_addr
        now = datetime.now()
        if ip in LOGIN_ATTEMPTS:
            attempts = [t for t in LOGIN_ATTEMPTS[ip] if (now - t).seconds < 60]
            LOGIN_ATTEMPTS[ip] = attempts
            if len(attempts) >= 10:
                return jsonify({'code': 429, 'message': '登录尝试过于频繁，请稍后再试'}), 429
        return f(*args, **kwargs)
    return decorated

# 注册
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    
    if not username or not email or not password:
        return jsonify({'code': 400, 'message': '请填写所有必填字段'}), 400
    if len(password) < 8:
        return jsonify({'code': 400, 'message': '密码至少需要8个字符'}), 400
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'code': 400, 'message': '邮箱格式不正确'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'code': 400, 'message': '用户名已存在'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'code': 400, 'message': '邮箱已被注册'}), 400
    
    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'code': 200, 'message': '注册成功'})

# 登录
@app.route('/api/auth/login', methods=['POST'])
@rate_limit
def login():
    data = request.get_json()
    login_id = data.get('username', '').strip()
    password = data.get('password', '')
    
    user = User.query.filter(
        (User.username == login_id) | (User.email == login_id)
    ).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        ip = request.remote_addr
        LOGIN_ATTEMPTS.setdefault(ip, []).append(datetime.now())
        return jsonify({'code': 401, 'message': '用户名或密码错误'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({
        'code': 200,
        'data': {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }
    })
```

---

### 1.3 登录注册前端页面

**Prompt:**
```
用 Next.js + Tailwind 创建登录页和注册页：
- 登录：用户名 + 密码，调用 /api/auth/login
- 注册：用户名 + 邮箱 + 密码 + 确认密码
- 成功后跳转到仪表盘首页
- 错误时显示红色提示信息
- 加载中按钮禁用并显示 loading 状态
- 暗色主题风格
```

**对应功能:** 前端登录/注册页面
**涉及文件:** `src/app/login/page.tsx`, `src/app/register/page.tsx`

**AI 原始输出（关键代码）:**

`src/app/login/page.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === '1') {
      setMessage('注册成功！请登录。');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await login(username, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          团队协作平台
        </h1>
        <p className="text-center text-gray-400 mb-8">登录你的账号</p>
        
        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">用户名 / 邮箱</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input w-full"
              placeholder="请输入用户名或邮箱"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full"
              placeholder="请输入密码"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          还没有账号？{' '}
          <Link href="/register" className="text-blue-400 hover:text-blue-300">
            立即注册
          </Link>
        </p>

        {/* 测试账号快捷登录 */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 text-center mb-2">快速体验</p>
          <div className="flex gap-2">
            <button onClick={() => { setUsername('testuser1'); setPassword('12345678'); }}
              className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg transition">
              testuser1
            </button>
            <button onClick={() => { setUsername('testuser2'); setPassword('12345678'); }}
              className="flex-1 text-xs bg-white/5 hover:bg-white/10 text-gray-300 py-2 rounded-lg transition">
              testuser2
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

`src/app/register/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (password.length < 8) {
      setError('密码至少需要8个字符');
      return;
    }
    
    setLoading(true);
    try {
      await register(username, email, password);
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          创建账号
        </h1>
        <p className="text-center text-gray-400 mb-8">加入团队协作平台</p>
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">用户名</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="glass-input w-full" placeholder="请输入用户名" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">邮箱</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full" placeholder="请输入邮箱" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full" placeholder="至少8个字符" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">确认密码</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="glass-input w-full" placeholder="请再次输入密码" required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          已有账号？{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">立即登录</Link>
        </p>
      </div>
    </div>
  );
}
```

---

## 2. 项目管理模块

### 2.1 项目管理 CRUD API

**Prompt:**
```
创建项目管理 RESTful API：
- GET /api/projects - 获取项目列表（只返回用户是成员的项目）
- POST /api/projects - 创建项目
- GET /api/projects/<id> - 获取项目详情
- PUT /api/projects/<id> - 更新项目（仅 owner/admin 可操作）
- DELETE /api/projects/<id> - 删除项目（仅 owner 可操作）
- 项目字段：name, description, status (planning/active/completed/archived)
```

**对应功能:** 项目管理 CRUD
**涉及文件:** `backend/app.py`（项目管理路由）、`backend/app/routes/projects.py`

**AI 原始输出（关键代码）:**

```python
# 数据模型
class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = db.relationship('User', backref='owned_projects')

# 获取项目列表（只返回用户是成员的项目）
@app.route('/api/projects', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = int(get_jwt_identity())
    search = request.args.get('search', '')
    
    # 查询用户作为成员的项目
    member_project_ids = db.session.query(ProjectMember.project_id)\
        .filter(ProjectMember.user_id == user_id)\
        .subquery()
    
    query = Project.query.filter(Project.id.in_(member_project_ids))
    if search:
        query = query.filter(Project.name.contains(search))
    
    projects = query.order_by(Project.updated_at.desc()).all()
    return jsonify(ok([p.to_dict() for p in projects]))

# 创建项目
@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify(fail('项目名称不能为空')), 400
    
    project = Project(
        name=name,
        description=data.get('description', ''),
        owner_id=user_id,
        status=data.get('status', 'planning')
    )
    db.session.add(project)
    db.session.flush()
    
    # 自动添加创建者为 owner
    member = ProjectMember(
        project_id=project.id,
        user_id=user_id,
        role='owner'
    )
    db.session.add(member)
    db.session.commit()
    
    return jsonify(ok(project.to_dict())), 201

# 更新项目
@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    
    # 权限校验：仅 owner/admin 可更新
    member = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not member or member.role not in ['owner', 'admin']:
        return jsonify(fail('无权限修改此项目')), 403
    
    data = request.get_json()
    if 'name' in data:
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']
    if 'status' in data:
        project.status = data['status']
    
    db.session.commit()
    return jsonify(ok(project.to_dict()))

# 删除项目
@app.route('/api/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    
    member = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not member or member.role != 'owner':
        return jsonify(fail('仅项目创建者可删除项目')), 403
    
    db.session.delete(project)
    db.session.commit()
    return jsonify(ok(None, '项目已删除'))
```

---

### 2.2 前端项目列表与详情页

**Prompt:**
```
创建项目列表页和详情页：
- 列表页：卡片布局，显示项目名、描述、状态标签、成员数
- 新建项目弹窗（Modal）
- 详情页：4 个 Tab（概览/任务/成员/文件）
- 支持编辑和删除项目
- 暗色主题，响应式设计
```

**对应功能:** 前端项目管理页面
**涉及文件:** `src/app/projects/page.tsx`, `src/app/projects/[id]/page.tsx`

**AI 原始输出（关键代码）:**

`src/app/projects/page.tsx`（项目列表卡片 + 创建/编辑 Modal）：
```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import { getProjects, createProject, updateProject, deleteProject, Project } from '@/lib/api';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  planning: { label: '规划中', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  active: { label: '进行中', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  completed: { label: '已完成', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  archived: { label: '已归档', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export default function ProjectsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'planning' });
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setError('');
      const res = await getProjects();
      if (res.code === 200) {
        setProjects(res.data || []);
      } else {
        setError(res.message || '加载失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) loadProjects();
  }, [authLoading, user, loadProjects]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    setSubmitting(true);
    try {
      await createProject(formData);
      setShowCreate(false);
      setFormData({ name: '', description: '', status: 'planning' });
      loadProjects();
    } catch { setError('创建失败'); }
    finally { setSubmitting(false); }
  };

  // ... 渲染卡片网格、Modal 等
}
```

---

## 3. 任务看板模块

### 3.1 任务管理 API

**Prompt:**
```
实现任务管理 API：
- 获取项目任务列表（支持按状态筛选）
- 创建任务（title, description, status, priority, assignee_id）
- 更新任务详情
- 快捷移动任务状态 PUT /api/tasks/<id>/move
- 删除任务
- 任务状态：todo / in_progress / done
- 优先级：low / medium / high / urgent
```

**对应功能:** 任务 CRUD API
**涉及文件:** `backend/app.py`（任务管理路由）

**AI 原始输出（关键代码）:**

```python
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='todo')
    priority = db.Column(db.String(10), default='medium')
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# 获取任务列表
@app.route('/api/tasks', methods=['GET'])
@jwt_required()
def get_tasks():
    project_id = request.args.get('project_id', type=int)
    status = request.args.get('status', '')
    
    query = Task.query
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify(ok([t.to_dict() for t in tasks]))

# 快捷移动任务
@app.route('/api/tasks/<int:task_id>/move', methods=['PUT'])
@jwt_required()
def move_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    new_status = data.get('status')
    
    if new_status not in ['todo', 'in_progress', 'done']:
        return jsonify(fail('无效的任务状态')), 400
    
    task.status = new_status
    db.session.commit()
    return jsonify(ok(task.to_dict()))
```

---

### 3.2 任务看板页面（拖拽）

**Prompt:**
```
创建任务看板页面，三列布局：
- 待办 (todo) | 进行中 (in_progress) | 已完成 (done)
- 每列显示任务卡片（标题、优先级标签、负责人）
- 支持点击卡片编辑任务
- 支持拖拽移动任务到不同列
- 新建任务弹窗
- 响应式设计，移动端纵向排列
```

**对应功能:** 任务看板页面
**涉及文件:** `src/app/tasks/page.tsx`

**AI 原始输出（关键代码）:**

```tsx
'use client';

const COLUMNS = [
  { key: 'todo', label: '待办', color: 'border-t-blue-500' },
  { key: 'in_progress', label: '进行中', color: 'border-t-yellow-500' },
  { key: 'done', label: '已完成', color: 'border-t-green-500' },
] as const;

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: { label: '紧急', className: 'bg-red-500/20 text-red-400' },
  high: { label: '高', className: 'bg-orange-500/20 text-orange-400' },
  medium: { label: '中', className: 'bg-blue-500/20 text-blue-400' },
  low: { label: '低', className: 'bg-gray-500/20 text-gray-400' },
};

export default function TasksPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // 拖拽处理
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', String(task.id));
  };

  const handleDrop = async (columnKey: string) => {
    setDragOverColumn(null);
    const taskId = Number(/* from dataTransfer */);
    // 乐观更新
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: columnKey } : t));
    try {
      await moveTask(taskId, columnKey);
    } catch {
      loadTasks(); // 失败回滚
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map(col => (
          <div key={col.key}
            className={`bg-white/5 rounded-xl p-4 border-t-2 ${col.color}
              ${dragOverColumn === col.key ? 'ring-2 ring-blue-500/50' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverColumn(col.key); }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={() => handleDrop(col.key)}>
            <h3 className="text-lg font-semibold mb-4">
              {col.label}
              <span className="ml-2 text-sm text-gray-400">
                {tasks.filter(t => t.status === col.key).length}
              </span>
            </h3>
            {tasks.filter(t => t.status === col.key).map(task => (
              <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)}
                className="glass-card p-3 mb-3 cursor-grab active:cursor-grabbing">
                <h4 className="font-medium">{task.title}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_CONFIG[task.priority]?.className}`}>
                  {PRIORITY_CONFIG[task.priority]?.label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 4. 团队协作模块

### 4.1 邀请系统

**Prompt:**
```
实现团队邀请系统：
- 添加成员：输入用户名发送邀请（状态 pending）
- 被邀请者在收件箱看到邀请，可以接受或拒绝
- 接受后自动加入项目成为成员
- 支持成员角色管理：owner / admin / member / viewer
- 创建项目时自动添加创建者为 owner
- 未读邀请数量实时显示在导航栏
```

**对应功能:** 团队邀请与成员管理
**涉及文件:** `backend/app.py`（邀请/成员路由）、`src/app/inbox/page.tsx`、`src/app/team/page.tsx`、`src/components/Navbar.tsx`

**AI 原始输出（关键代码）:**

```python
# 邀请模型
class Invitation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    invitee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role = db.Column(db.String(20), default='member')
    status = db.Column(db.String(20), default='pending')  # pending/accepted/rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# 发送邀请
@app.route('/api/invitations', methods=['POST'])
@jwt_required()
def send_invitation():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    project_id = data.get('project_id')
    username = data.get('username', '').strip()
    role = data.get('role', 'member')
    
    invitee = User.query.filter_by(username=username).first()
    if not invitee:
        return jsonify(fail('用户不存在')), 404
    
    # 检查是否已是成员
    existing = ProjectMember.query.filter_by(
        project_id=project_id, user_id=invitee.id
    ).first()
    if existing:
        return jsonify(fail('该用户已是项目成员')), 400
    
    invitation = Invitation(
        project_id=project_id,
        inviter_id=user_id,
        invitee_id=invitee.id,
        role=role
    )
    db.session.add(invitation)
    db.session.commit()
    return jsonify(ok(invitation.to_dict())), 201

# 获取未读邀请数
@app.route('/api/invitations/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    user_id = int(get_jwt_identity())
    count = Invitation.query.filter_by(
        invitee_id=user_id, status='pending'
    ).count()
    return jsonify(ok({'count': count}))
```

导航栏未读徽章（`src/components/Navbar.tsx`）：
```tsx
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  if (!user) return;
  getUnreadInvitationCount()
    .then(res => { if (res.code === 200) setUnreadCount(res.data.count); })
    .catch(() => {});
}, [user]);

// 渲染
<Link href="/inbox" className="relative">
  <span>收件箱</span>
  {unreadCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs 
      rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount}
    </span>
  )}
</Link>
```

---

## 5. 文件管理模块

### 5.1 文件上传与安全加固

**Prompt:**
```
实现文件管理功能：
1. 文件上传 API（POST multipart/form-data）
2. 文件列表、下载、删除
3. 文件类型白名单：pdf/doc/docx/xlsx/ppt/图片/文本/代码/压缩包
4. 文件大小限制 50MB
5. 安全文件名过滤（防止路径遍历攻击）
6. 生成唯一文件名避免冲突
```

**对应功能:** 文件上传管理
**涉及文件:** `backend/app.py`（文件路由）、`src/app/files/page.tsx`

**AI 原始输出（关键代码）:**

```python
import os
import uuid
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

ALLOWED_EXTENSIONS = {
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
    'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css',
    'zip', 'rar', '7z', 'tar', 'gz',
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def sanitize_filename(filename):
    """安全文件名过滤，防止路径遍历攻击"""
    # 使用 werkzeug 的 secure_filename 清理
    filename = secure_filename(filename)
    # 移除所有路径分隔符
    filename = filename.replace('/', '').replace('\\', '')
    return filename

class ProjectFile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    original_name = db.Column(db.String(256), nullable=False)
    stored_name = db.Column(db.String(256), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@app.route('/api/files/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify(fail('未选择文件')), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify(fail('未选择文件')), 400
    
    if not allowed_file(file.filename):
        return jsonify(fail('不支持的文件类型')), 400
    
    # 检查 Content-Length
    if request.content_length and request.content_length > MAX_FILE_SIZE:
        return jsonify(fail('文件大小超过50MB限制')), 400
    
    # 生成唯一文件名
    ext = file.filename.rsplit('.', 1)[1].lower()
    stored_name = f"{uuid.uuid4().hex}_{sanitize_filename(file.filename)}"
    filepath = os.path.join(UPLOAD_FOLDER, stored_name)
    
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    file.save(filepath)
    
    # 保存后二次检查大小
    actual_size = os.path.getsize(filepath)
    if actual_size > MAX_FILE_SIZE:
        os.remove(filepath)
        return jsonify(fail('文件大小超过50MB限制')), 400
    
    project_file = ProjectFile(
        original_name=file.filename,
        stored_name=stored_name,
        file_size=actual_size,
        project_id=request.form.get('project_id', type=int),
        uploader_id=int(get_jwt_identity())
    )
    db.session.add(project_file)
    db.session.commit()
    
    return jsonify(ok(project_file.to_dict())), 201
```

---

## 6. 数据统计仪表盘

### 6.1 统计 API 与仪表盘

**Prompt:**
```
创建数据统计功能：
- API 返回概览数据（项目数/任务数/用户数/文件数/成员数）
- 任务状态分布（todo/in_progress/done）
- 项目状态分布
- 优先级分布
- 前端仪表盘页面用图表展示
- 统计范围限定为当前用户参与的项目
```

**对应功能:** 数据统计仪表盘
**涉及文件:** `backend/app.py`（stats 路由）、`src/app/stats/page.tsx`、`src/app/page.tsx`

**AI 原始输出（关键代码）:**

```python
@app.route('/api/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    
    # 获取用户参与的项目ID
    member_project_ids = [m.project_id for m in 
        ProjectMember.query.filter_by(user_id=user_id).all()]
    
    # 概览数据
    project_count = len(member_project_ids)
    task_count = Task.query.filter(Task.project_id.in_(member_project_ids)).count() if member_project_ids else 0
    file_count = ProjectFile.query.filter(ProjectFile.project_id.in_(member_project_ids)).count() if member_project_ids else 0
    member_count = ProjectMember.query.filter(ProjectMember.project_id.in_(member_project_ids)).count() if member_project_ids else 0
    
    # 任务状态分布
    task_status_dist = {}
    if member_project_ids:
        for status in ['todo', 'in_progress', 'done']:
            task_status_dist[status] = Task.query.filter(
                Task.project_id.in_(member_project_ids),
                Task.status == status
            ).count()
    
    # 优先级分布
    priority_dist = {}
    if member_project_ids:
        for p in ['low', 'medium', 'high', 'urgent']:
            priority_dist[p] = Task.query.filter(
                Task.project_id.in_(member_project_ids),
                Task.priority == p
            ).count()
    
    return jsonify(ok({
        'overview': {
            'projects': project_count,
            'tasks': task_count,
            'files': file_count,
            'members': member_count,
            'users': User.query.count()
        },
        'task_status': task_status_dist,
        'priority': priority_dist
    }))
```

前端统计展示（`src/app/stats/page.tsx`）：
```tsx
// 使用简单的 CSS 柱状图展示数据分布
{stats && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* 任务状态分布 */}
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">任务状态分布</h3>
      <div className="space-y-3">
        {Object.entries(stats.task_status).map(([status, count]) => (
          <div key={status}>
            <div className="flex justify-between text-sm mb-1">
              <span>{STATUS_LABELS[status]}</span>
              <span className="text-gray-400">{count}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${max > 0 ? (count/max)*100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
    
    {/* 优先级分布 */}
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4">优先级分布</h3>
      {/* 类似柱状图 */}
    </div>
  </div>
)}
```

---

## 7. 安全加固

### 7.1 JWT 密钥环境变量化

**Prompt:**
```
安全加固：
1. JWT_SECRET_KEY 和 SECRET_KEY 不再硬编码，改用 secrets.token_hex(32) 随机生成
2. Debug 模式改为 FLASK_DEBUG 环境变量控制
3. CORS 改为 CORS_ORIGINS 环境变量可配置
4. 更新 .env.example 添加安全配置说明
```

**对应功能:** 安全配置
**涉及文件:** `backend/app.py`, `.env.example`

**AI 原始输出（关键代码）:**

```python
# backend/app.py 安全配置部分
import os
import secrets
from dotenv import load_dotenv

load_dotenv()

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY') or secrets.token_hex(32)
app.config['FLASK_DEBUG'] = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

_cors_origins_env = os.environ.get('CORS_ORIGINS', '')
if _cors_origins_env:
    _cors_origins = [o.strip() for o in _cors_origins_env.split(',')]
else:
    _cors_origins = [
        'http://localhost:3000',
        'https://team-collab-platform-ccmx19m5.edgeone.cool',
        'https://team-collab-platform-7thc.vercel.app',
    ]
CORS(app, origins=_cors_origins, supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
```

`.env.example`:
```bash
# ============ 前端 ============
NEXT_PUBLIC_API_URL=http://localhost:5000

# ============ 后端 ============
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FLASK_DEBUG=true
CORS_ORIGINS=http://localhost:3000

# 生产环境建议：
# - 使用 python -c "import secrets; print(secrets.token_hex(32))" 生成密钥
# - 将 FLASK_DEBUG 设为 false
# - CORS_ORIGINS 设置为前端部署域名（逗号分隔）
```

---

## 8. 代码质量与部署

### 8.1 ESLint 修复

**Prompt:**
```
运行 ESLint 并修复所有警告和错误：
- 清理未使用的变量和导入
- 修复 React Hook 依赖警告
- 确保 npx eslint src/ 全绿通过
```

**对应功能:** 代码质量
**涉及文件:** `src/app/inbox/page.tsx`, `src/app/page.tsx`, `src/app/tasks/page.tsx`, `src/components/Navbar.tsx`, `src/lib/auth.ts`

**AI 原始输出（修复内容）:**

修复了以下 5 个 ESLint 问题：

1. **`src/lib/auth.ts`** - 导出 `getRefreshToken` 函数（之前未导出但被引用）
2. **`src/app/page.tsx`** - 移除未使用的 `useState` 导入
3. **`src/app/tasks/page.tsx`** - 添加 `loadTasks` 到 `useCallback` 依赖数组
4. **`src/components/Navbar.tsx`** - 添加 `pathname` 到 `useEffect` 依赖数组
5. **`src/app/inbox/page.tsx`** - 移除未使用的变量

```typescript
// src/lib/auth.ts 修复 - 导出 getRefreshToken
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}
```

---

### 8.2 部署配置

**Prompt:**
```
准备生产部署：
1. vercel.json：Next.js 框架，香港区域部署
2. backend/Procfile：gunicorn 启动命令
3. backend/runtime.txt：Python 3.11
4. requirements.txt 添加 gunicorn
5. README 补充部署指南章节
```

**对应功能:** 部署配置
**涉及文件:** `vercel.json`, `backend/Procfile`, `backend/runtime.txt`, `backend/requirements.txt`, `README.md`

**AI 原始输出:**

`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["hkg1"]
}
```

`backend/Procfile`:
```
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

`backend/runtime.txt`:
```
python-3.11.11
```

`backend/requirements.txt`:
```
Flask==3.0.3
Flask-CORS==5.0.0
Flask-SQLAlchemy==3.1.1
Flask-JWT-Extended==4.6.0
SQLAlchemy==2.0.35
python-dotenv==1.0.1
gunicorn==22.0.0
bcrypt==4.2.0
```

---

## 9. UI 美化

### 9.1 全局 UI 美化

**Prompt:**
```
美化整体 UI：
- 暗色主题配色方案（深蓝/紫渐变背景）
- 卡片悬浮效果和过渡动画
- 统一的按钮样式（渐变 + hover 效果）
- 响应式布局适配
- 导航栏优化（Logo + 菜单 + 用户信息 + 通知徽章）
```

**对应功能:** UI/UX 美化
**涉及文件:** `src/app/globals.css`, `src/components/Navbar.tsx`, 各页面组件

**AI 原始输出（关键代码）:**

`src/app/globals.css` 设计系统（核心 CSS 变量与组件类）：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-card: rgba(30, 41, 59, 0.6);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: rgba(148, 163, 184, 0.1);
  --accent-blue: #3b82f6;
  --accent-purple: #8b5cf6;
  --accent-gradient: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
}

.light {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.8);
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-color: rgba(0, 0, 0, 0.08);
}

/* 页面背景 */
.page-bg {
  background: var(--bg-primary);
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%);
}

/* 玻璃态卡片 */
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  transition: all 0.3s ease;
}
.glass-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

/* 按钮系统 */
.btn-primary {
  background: var(--accent-gradient);
  color: white;
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.3s ease;
}
.btn-primary:hover {
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 24px;
  border-radius: 10px;
  transition: all 0.3s ease;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 10px 24px;
  border-radius: 10px;
  transition: all 0.3s ease;
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 输入框 */
.glass-input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 16px;
  color: var(--text-primary);
  transition: all 0.3s ease;
  outline: none;
}
.glass-input:focus {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* 状态徽章 */
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn { animation: fadeIn 0.5s ease-out; }
.animate-slideUp { animation: slideUp 0.5s ease-out; }
.animate-scaleIn { animation: scaleIn 0.3s ease-out; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  animation: fadeIn 0.2s ease-out;
}
.modal-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  max-width: 500px; width: 90%;
  max-height: 90vh; overflow-y: auto;
  animation: scaleIn 0.3s ease-out;
}
```

---

## 10. 调试与 Bug 修复

### 10.1 CORS 跨域问题

**Prompt:**
```
修复：前端调用后端 API 时出现 CORS 跨域错误。
前端在 localhost:3000，后端在 localhost:5000。
Cookie 中的 Token 也无法正常发送。
```

**对应功能:** CORS 修复
**涉及文件:** `backend/app.py`, `src/lib/api.ts`, `src/middleware.ts`

**AI 原始输出（修复内容）:**

```python
# 修复前：CORS(app)  # 无参数，默认不允许带凭证的跨域请求
# 修复后：
CORS(app, 
     origins=['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
```

```typescript
// src/lib/api.ts 修复 - fetch 添加 credentials
async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',  // 允许发送 cookie
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  });
  // ...
}
```

---

### 10.2 仪表盘统计数据范围

**Prompt:**
```
修复：仪表盘统计数据显示了所有用户的数据，应该只显示当前用户参与的项目的数据。
修改 /api/stats 接口，根据当前用户的项目成员关系过滤。
```

**对应功能:** 数据范围修复
**涉及文件:** `backend/app.py`（stats 路由）

**AI 原始输出（修复对比）:**

```python
# 修复前 - 统计所有用户数据
task_count = Task.query.count()

# 修复后 - 只统计当前用户参与的项目
user_id = int(get_jwt_identity())
member_project_ids = [m.project_id for m in 
    ProjectMember.query.filter_by(user_id=user_id).all()]
task_count = Task.query.filter(
    Task.project_id.in_(member_project_ids)
).count() if member_project_ids else 0
```

---

### 10.3 项目成员权限修复

**Prompt:**
```
修复：
1. 创建项目时自动添加创建者为 owner 成员
2. 只有项目成员才能访问项目详情
3. 任务创建失败时显示具体错误信息
4. 邀请流程：添加成员改为发送邀请，对方在收件箱接受后才加入
```

**对应功能:** 权限与流程修复
**涉及文件:** `backend/app.py`（项目/任务/邀请路由）

**AI 原始输出（修复内容）:**

```python
# 修复 1：创建项目时自动添加 owner
@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    # ... 创建项目后
    db.session.flush()  # 获取 project.id
    member = ProjectMember(
        project_id=project.id,
        user_id=user_id,
        role='owner'
    )
    db.session.add(member)
    db.session.commit()

# 修复 2：项目详情权限校验
@app.route('/api/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    
    # 检查是否为项目成员
    member = ProjectMember.query.filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not member:
        return jsonify(fail('无权访问此项目')), 403
    
    return jsonify(ok(project.to_dict()))

# 修复 3：任务创建错误反馈
@app.route('/api/tasks', methods=['POST'])
@jwt_required()
def create_task():
    data = request.get_json()
    if not data.get('title', '').strip():
        return jsonify(fail('任务标题不能为空')), 400
    if not data.get('project_id'):
        return jsonify(fail('请指定所属项目')), 400
    # ...

# 修复 4：邀请流程改造
# 原：直接添加成员
# 新：发送邀请 → 被邀请者在收件箱接受 → 自动加入
```

---

## 11. 生产部署与调试

### 11.1 首次部署 - Vercel + Railway

**Prompt:**
```
帮我把这个项目部署到 Vercel（前端）和 Railway（后端）。
前端需要设置 NEXT_PUBLIC_API_URL 指向后端地址。
```

**对应功能:** 首次生产部署
**涉及文件:** `vercel.json`, `backend/Procfile`, `backend/runtime.txt`

**AI 原始输出:**

Railway 环境变量配置：
```
SECRET_KEY=<随机生成32位hex>
JWT_SECRET_KEY=<随机生成32位hex>
FLASK_DEBUG=false
CORS_ORIGINS=https://team-collab-platform-7thc.vercel.app
```

Vercel 环境变量配置：
```
NEXT_PUBLIC_API_URL=https://team-collab-platform-production.up.railway.app
```

部署结果：
- 前端 Vercel: `https://team-collab-platform-7thc.vercel.app` ✅
- 后端 Railway: `https://team-collab-platform-production.up.railway.app` ✅

---

### 11.2 国内访问加速 - EdgeOne Pages

**Prompt:**
```
Vercel 在国内访问不稳定，帮我用 EdgeOne Pages 再部署一个国内加速版本。
```

**对应功能:** EdgeOne Pages 部署
**涉及文件:** `src/lib/api.ts`, 环境变量配置

**AI 原始输出:**

EdgeOne Pages 环境变量：
```
NEXT_PUBLIC_API_URL=https://team-collab-platform-production.up.railway.app
```

部署结果：`https://team-collab-platform-ccmx19m5.edgeone.cool` ✅

---

### 11.3 bcrypt 依赖缺失修复

**Prompt:**
```
（截图）后端启动报错：No module named 'bcrypt'，requirements.txt 漏了这个依赖。
```

**对应功能:** 依赖修复
**涉及文件:** `backend/requirements.txt`

**AI 原始输出（修复）:**

```diff
  Flask==3.0.3
  Flask-CORS==5.0.0
  Flask-SQLAlchemy==3.1.1
  Flask-JWT-Extended==4.6.0
  SQLAlchemy==2.0.35
  python-dotenv==1.0.1
  gunicorn==22.0.0
+ bcrypt==4.2.0
```

提交推送后 Railway 自动重新部署，问题解决。

---

### 11.4 前端 API 地址环境变量

**Prompt:**
```
前端 auth.ts 里硬编码了 API_BASE = localhost:5000，应该读取 NEXT_PUBLIC_API_URL 环境变量。
```

**对应功能:** 环境变量配置
**涉及文件:** `src/lib/auth.ts`

**AI 原始输出（修复对比）:**

```diff
- const API_BASE = 'http://localhost:5000';
+ const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
```

---

### 11.5 注册页密码提示不一致

**Prompt:**
```
注册页密码框显示"至少6位"但后端要求8位，把这个提示改一致。
```

**对应功能:** UI 文案修复
**涉及文件:** `src/app/register/page.tsx`

**AI 原始输出（修复对比）:**

```diff
- <input ... placeholder="至少6个字符" />
+ <input ... placeholder="至少8个字符" />
```

---

### 11.6 CORS 跨域问题（Authorization 头）

**Prompt:**
```
（截图）前端带 Authorization 请求后端 API 时 CORS 跨域失败。
项目列表和未读邀请数都显示 Failed to fetch。
```

**对应功能:** CORS 修复
**涉及文件:** `backend/app/__init__.py`

**AI 原始输出（修复对比）:**

```diff
  CORS(
      app,
      origins=_cors_origins,
      supports_credentials=True,
+     allow_headers=["Content-Type", "Authorization"],
      methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  )
```

同时添加 EdgeOne 和 Vercel 域名到 CORS 白名单：
```diff
  _cors_origins = [
      "http://localhost:3000",
+     "https://team-collab-platform-ccmx19m5.edgeone.cool",
+     "https://team-collab-platform-7thc.vercel.app",
  ]
```

---

### 11.7 API 请求失败深度排查

**Prompt:**
```
CORS 配置已修复但项目管理页仍然 Failed to fetch。
Console 手动 fetch 成功返回 200 空数组，但页面自动请求失败。
```

**对应功能:** 部署调试
**涉及文件:** `src/lib/api.ts`, `src/app/projects/page.tsx`

**AI 原始输出（排查步骤与结论）:**

排查过程：
1. ✅ Railway 后端已部署最新代码（OPTIONS 预检返回 200）
2. ✅ CORS 响应头 `Access-Control-Allow-Origin` 正确返回 EdgeOne 域名
3. ✅ 手动 `fetch()` 在 Console 执行成功，返回 `{code: 200, data: [], message: 'success'}`
4. ⚠️ 页面自动发起的请求显示 `net::ERR_FAILED`
5. 推测原因：可能是浏览器缓存、Service Worker 干扰或 EdgeOne CDN 缓存问题
6. 建议用户尝试无痕模式或强制刷新（Ctrl+Shift+R）

当前状态：待进一步排查。

---

## Prompt 使用统计

| 类别 | Prompt 数量 | 主要模块 |
|------|------------|----------|
| 项目初始化 | 3 | 项目骨架、认证系统、登录注册页面 |
| 功能开发 | 8 | 项目/任务/团队/文件/统计 |
| 安全加固 | 2 | 密钥环境变量、文件白名单 |
| 代码质量 | 1 | ESLint 修复 |
| 部署配置 | 1 | Vercel + Railway |
| UI 美化 | 1 | 暗色主题设计 |
| Bug 修复 | 4 | CORS/权限/数据范围/邀请流程 |
| 部署调试 | 7 | EdgeOne/Railway/CORS/依赖/环境变量 |
| **合计** | **27** | |

---

## 附录：项目文件索引

以下为 Prompt 驱动的 AI 生成的完整文件列表，供代码审查对照：

| 文件 | 行数 | 对应 Prompt |
|------|------|-------------|
| `backend/app.py` | 952 | 1.1, 1.2, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 10.1~10.3 |
| `backend/app/__init__.py` | 69 | 11.6 |
| `backend/app/routes/auth.py` | 106 | 1.2 |
| `backend/app/routes/projects.py` | 159 | 2.1 |
| `backend/app/models/user.py` | 22 | 1.1 |
| `backend/app/models/project.py` | 34 | 2.1 |
| `src/lib/api.ts` | 359 | 1.1, 10.1 |
| `src/lib/auth-context.tsx` | 158 | 1.2 |
| `src/lib/auth.ts` | - | 8.1, 11.4 |
| `src/app/login/page.tsx` | 116 | 1.3 |
| `src/app/register/page.tsx` | 111 | 1.3, 11.5 |
| `src/app/projects/page.tsx` | 283 | 2.2 |
| `src/app/projects/[id]/page.tsx` | - | 2.2 |
| `src/app/tasks/page.tsx` | 323 | 3.2 |
| `src/app/team/page.tsx` | - | 4.1 |
| `src/app/inbox/page.tsx` | - | 4.1 |
| `src/app/files/page.tsx` | - | 5.1 |
| `src/app/stats/page.tsx` | - | 6.1 |
| `src/app/page.tsx` | 252 | 6.1 |
| `src/app/globals.css` | 434 | 9.1 |
| `src/components/Navbar.tsx` | 284 | 4.1, 9.1 |
| `vercel.json` | 9 | 8.2, 11.1 |
| `backend/Procfile` | 1 | 8.2, 11.1 |
| `backend/runtime.txt` | 1 | 8.2, 11.1 |
| `backend/requirements.txt` | 8 | 8.2, 11.3 |
| `.env.example` | 35 | 7.1 |
