# 团队协作平台 - API 接口文档

## 1. 基础信息

- **Base URL**：`http://localhost:5000`
- **数据格式**：JSON
- **认证方式**：JWT Bearer Token

### 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2026-07-17T10:00:00.000000+00:00"
}
```

### HTTP 状态码说明

| code | 含义 |
|------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未认证 / Token 过期 |
| 404 | 资源不存在 |
| 429 | 请求频率过高 |

---

## 2. 系统接口

### 2.1 健康检查

```
GET /api/health
```

**无需认证**

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "status": "healthy",
    "database": "connected"
  }
}
```

---

## 3. 认证接口

### 3.1 用户注册

```
POST /api/auth/register
```

**速率限制**：5次/分钟

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名，至少3个字符 |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码，至少6个字符 |

**请求示例**：
```json
{
  "username": "zhangsan",
  "email": "zhangsan@team.com",
  "password": "123456"
}
```

**响应示例**：
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "id": 4,
    "username": "zhangsan",
    "email": "zhangsan@team.com",
    "created_at": "2026-07-17T10:00:00.000000+00:00"
  }
}
```

### 3.2 用户登录

```
POST /api/auth/login
```

**速率限制**：10次/分钟

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名或邮箱 |
| password | string | 是 | 密码 |

**响应示例**：
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@team.com",
      "created_at": "..."
    },
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi..."
  }
}
```

### 3.3 获取当前用户

```
GET /api/auth/me
Authorization: Bearer {access_token}
```

### 3.4 刷新 Token

```
POST /api/auth/refresh
Authorization: Bearer {refresh_token}
```

---

## 4. 项目管理接口

### 4.1 获取项目列表

```
GET /api/projects
Authorization: Bearer {token}
```

### 4.2 创建项目

```
POST /api/projects
Authorization: Bearer {token}
Content-Type: application/json
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 项目名称 |
| description | string | 否 | 项目描述 |
| status | string | 否 | planning/active/completed/archived |

### 4.3 获取项目详情

```
GET /api/projects/{id}
Authorization: Bearer {token}
```

### 4.4 更新项目

```
PUT /api/projects/{id}
Authorization: Bearer {token}
```

### 4.5 删除项目

```
DELETE /api/projects/{id}
Authorization: Bearer {token}
```

---

## 5. 任务管理接口

### 5.1 获取项目任务列表

```
GET /api/projects/{project_id}/tasks
Authorization: Bearer {token}
```

### 5.2 创建任务

```
POST /api/projects/{project_id}/tasks
Authorization: Bearer {token}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 任务标题 |
| description | string | 否 | 任务描述 |
| status | string | 否 | todo/in_progress/done |
| priority | string | 否 | low/medium/high/urgent |
| assignee_id | number | 否 | 负责人用户ID |

### 5.3 更新任务

```
PUT /api/tasks/{task_id}
Authorization: Bearer {token}
```

### 5.4 移动任务状态

```
PUT /api/tasks/{task_id}/move
Authorization: Bearer {token}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 是 | todo/in_progress/done |

### 5.5 删除任务

```
DELETE /api/tasks/{task_id}
Authorization: Bearer {token}
```

---

## 6. 团队协作接口

### 6.1 获取项目成员

```
GET /api/projects/{project_id}/members
Authorization: Bearer {token}
```

### 6.2 添加成员

```
POST /api/projects/{project_id}/members
Authorization: Bearer {token}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 要添加的用户名 |
| role | string | 否 | admin/member/viewer |

### 6.3 更新成员角色

```
PUT /api/members/{member_id}
Authorization: Bearer {token}
```

### 6.4 移除成员

```
DELETE /api/members/{member_id}
Authorization: Bearer {token}
```

---

## 7. 文件管理接口

### 7.1 获取项目文件列表

```
GET /api/projects/{project_id}/files
Authorization: Bearer {token}
```

### 7.2 上传文件

```
POST /api/projects/{project_id}/files
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 上传的文件（最大50MB） |

### 7.3 下载/预览文件

```
GET /api/files/{file_id}/download?token={access_token}
```

**说明**：可通过 query string 或 Authorization header 传递 Token

### 7.4 删除文件

```
DELETE /api/files/{file_id}
Authorization: Bearer {token}
```

---

## 8. 数据统计接口

### 8.1 获取统计数据

```
GET /api/stats
Authorization: Bearer {token}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "overview": {
      "projects": 3,
      "tasks": 5,
      "users": 3,
      "files": 2,
      "members": 4
    },
    "tasks": {
      "todo": 2,
      "in_progress": 2,
      "done": 1
    },
    "projects_status": {
      "planning": 1,
      "active": 1,
      "completed": 1
    },
    "priority": {
      "low": 1,
      "medium": 2,
      "high": 1,
      "urgent": 1
    }
  }
}
```

### 8.2 获取用户列表

```
GET /api/users
Authorization: Bearer {token}
```

---

## 9. 错误码汇总

| code | message | 触发场景 |
|------|---------|---------|
| 400 | 用户名和密码不能为空 | 登录/注册缺少参数 |
| 400 | 用户名至少3个字符 | 注册用户名太短 |
| 400 | 密码至少6个字符 | 注册密码太短 |
| 400 | 用户名已被注册 | 重复用户名 |
| 400 | 邮箱已被注册 | 重复邮箱 |
| 400 | 项目名称不能为空 | 创建项目缺少名称 |
| 400 | 任务标题不能为空 | 创建任务缺少标题 |
| 400 | 该用户已是项目成员 | 重复添加成员 |
| 400 | 请选择要上传的文件 | 上传未选择文件 |
| 401 | 用户名或密码错误 | 登录失败 |
| 401 | 登录已过期，请重新登录 | Token 过期 |
| 401 | 无效的登录凭证 | Token 无效 |
| 401 | 请先登录 | 缺少 Token |
| 404 | 用户不存在 | 查询用户失败 |
| 404 | 项目不存在 | 查询项目失败 |
| 404 | 任务不存在 | 查询任务失败 |
| 404 | 文件不存在 | 查询文件失败 |
| 429 | 请求过于频繁，请稍后再试 | 超过速率限制 |
