# Prompt 日志

> 本文档记录了项目开发过程中使用 AI 编程工具（CodeBuddy/Cursor）的关键 Prompt 及 AI 输出。
> 每条 Prompt 标注了对应的功能模块和涉及文件，便于对照代码审查。

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
**AI 输出摘要:** 生成了 Flask 项目入口文件（含 SQLAlchemy 初始化、JWT 配置、CORS 设置），Next.js App Router 结构（login/register 页面），以及前端 API 调用层 `src/lib/api.ts`。

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
**涉及文件:** `backend/app.py`（认证路由部分）
**AI 输出摘要:** 生成了完整的 4 个认证路由，包含 werkzeug 密码哈希、JWT 双 Token 机制、登录速率限制装饰器。前端生成了 `auth-context.tsx` 状态管理。

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
**AI 输出摘要:** 生成了带表单验证、错误处理、loading 状态的登录注册页，暗色主题 Tailwind 样式，Token 存储在 localStorage。

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
**涉及文件:** `backend/app.py`（项目管理路由）
**AI 输出摘要:** 生成了 5 个 RESTful API 端点，包含 JWT 认证装饰器、权限校验（角色检查）、SQLAlchemy 模型定义。

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
**AI 输出摘要:** 生成了卡片式项目列表（含新建 Modal）、Tab 切换详情页，Tailwind 暗色主题样式。

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
**AI 输出摘要:** 生成了完整的任务 CRUD API，包含状态移动快捷接口、权限校验。

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
**AI 输出摘要:** 生成了三列看板布局，任务卡片含优先级颜色标签，拖拽排序功能，新建/编辑任务 Modal。

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
**涉及文件:** `backend/app.py`（邀请/成员路由）, `src/app/inbox/page.tsx`, `src/app/team/page.tsx`, `src/components/Navbar.tsx`
**AI 输出摘要:** 生成了完整的邀请系统（发送/接收/响应），收件箱页面，角色管理，导航栏未读徽章。

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
**涉及文件:** `backend/app.py`（文件路由）, `src/app/files/page.tsx`
**AI 输出摘要:** 生成了文件上传/下载/删除 API，包含 `ALLOWED_EXTENSIONS` 白名单（30+类型）、`sanitize_filename()` 安全过滤、双重文件大小校验（Content-Length + 保存后检查）。

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
**涉及文件:** `backend/app.py`（stats 路由）, `src/app/stats/page.tsx`, `src/app/page.tsx`
**AI 输出摘要:** 生成了统计 API 和仪表盘页面，使用 Chart.js 风格展示数据分布，限定用户范围。

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
**AI 输出摘要:** 替换硬编码密钥为 `secrets.token_hex(32)`，添加 `FLASK_DEBUG` 和 `CORS_ORIGINS` 环境变量支持。

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
**AI 输出摘要:** 修复了 5 个问题（4 个 unused variables + 2 个 react-hooks/exhaustive-deps），导出 `getRefreshToken` 函数。

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
**AI 输出摘要:** 生成了完整的部署配置文件，Vercel + Railway/Render 部署指南。

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
**AI 输出摘要:** 生成了完整的暗色主题设计系统，渐变背景、卡片动效、统一按钮样式、响应式断点。

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
**AI 输出摘要:** 修复了 CORS 配置（允许 localhost:3000-3002），添加 `supports_credentials=True`，暴露 Authorization header。

---

### 10.2 仪表盘统计数据范围

**Prompt:**
```
修复：仪表盘统计数据显示了所有用户的数据，应该只显示当前用户参与的项目的数据。
修改 /api/stats 接口，根据当前用户的项目成员关系过滤。
```

**对应功能:** 数据范围修复
**涉及文件:** `backend/app.py`（stats 路由）
**AI 输出摘要:** 修改统计查询，添加 `JOIN project_members` 条件，限定为当前用户的项目。

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
**AI 输出摘要:** 修复了 4 个权限问题，添加了自动添加 owner、成员权限校验、错误反馈、邀请流程改造。

---

## Prompt 使用统计

| 类别 | Prompt 数量 | 主要模块 |
|------|------------|----------|
| 项目初始化 | 3 | 项目骨架、认证系统 |
| 功能开发 | 8 | 项目/任务/团队/文件/统计 |
| 安全加固 | 2 | 密钥环境变量、文件白名单 |
| 代码质量 | 1 | ESLint 修复 |
| 部署配置 | 1 | Vercel + Railway |
| UI 美化 | 1 | 暗色主题设计 |
| Bug 修复 | 4 | CORS/权限/数据范围 |
| **合计** | **20** | |
