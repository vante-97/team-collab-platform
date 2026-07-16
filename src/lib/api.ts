const API_BASE = "http://localhost:5000";

/** 后端统一返回格式：{ code, data, message, timestamp } */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  status: "planning" | "active" | "completed" | "archived";
  owner_id?: number;
  owner_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assignee_id: number | null;
  assignee_name: string | null;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  user_id: number;
  username: string;
  email: string;
  project_id: number;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
}

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  return null;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ---- 基础 API ----
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function getHome() {
  const res = await fetch(`${API_BASE}/`);
  return res.json();
}

// ---- 认证 API ----
export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function register(username: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  return res.json();
}

export async function getMe(): Promise<ApiResponse<User>> {
  return fetchApi<ApiResponse<User>>("/api/auth/me");
}

// ---- 项目管理 API ----
export async function getProjects(): Promise<ApiResponse<Project[]>> {
  return fetchApi<ApiResponse<Project[]>>("/api/projects");
}

export async function createProject(data: {
  name: string;
  description?: string;
  status?: string;
}): Promise<ApiResponse<Project>> {
  return fetchApi<ApiResponse<Project>>("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function getProjectById(id: number): Promise<ApiResponse<Project>> {
  return fetchApi<ApiResponse<Project>>(`/api/projects/${id}`);
}

export async function updateProject(
  id: number,
  data: { name?: string; description?: string; status?: string }
): Promise<ApiResponse<Project>> {
  return fetchApi<ApiResponse<Project>>(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: number): Promise<ApiResponse<null>> {
  return fetchApi<ApiResponse<null>>(`/api/projects/${id}`, {
    method: "DELETE",
  });
}

export async function getUsers(): Promise<ApiResponse<User[]>> {
  return fetchApi<ApiResponse<User[]>>("/api/users");
}

export async function refreshToken(): Promise<ApiResponse<{ access_token: string }>> {
  const token = localStorage.getItem("refresh_token");
  return fetchApi<ApiResponse<{ access_token: string }>>("/api/auth/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ---- 任务管理 API ----
export async function getTasks(projectId: number): Promise<ApiResponse<Task[]>> {
  return fetchApi<ApiResponse<Task[]>>(`/api/projects/${projectId}/tasks`);
}

export async function createTask(
  projectId: number,
  data: { title: string; description?: string; status?: string; priority?: string; assignee_id?: number }
): Promise<ApiResponse<Task>> {
  return fetchApi<ApiResponse<Task>>(`/api/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateTask(
  taskId: number,
  data: { title?: string; description?: string; status?: string; priority?: string; assignee_id?: number }
): Promise<ApiResponse<Task>> {
  return fetchApi<ApiResponse<Task>>(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function moveTask(taskId: number, status: string): Promise<ApiResponse<Task>> {
  return fetchApi<ApiResponse<Task>>(`/api/tasks/${taskId}/move`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}

export async function deleteTask(taskId: number): Promise<ApiResponse<null>> {
  return fetchApi<ApiResponse<null>>(`/api/tasks/${taskId}`, {
    method: "DELETE",
  });
}

// ---- 团队协作 API ----
export async function getMembers(projectId: number): Promise<ApiResponse<TeamMember[]>> {
  return fetchApi<ApiResponse<TeamMember[]>>(`/api/projects/${projectId}/members`);
}

export async function addMember(
  projectId: number,
  data: { username: string; role?: string }
): Promise<ApiResponse<TeamMember>> {
  return fetchApi<ApiResponse<TeamMember>>(`/api/projects/${projectId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateMemberRole(
  memberId: number,
  role: string
): Promise<ApiResponse<TeamMember>> {
  return fetchApi<ApiResponse<TeamMember>>(`/api/members/${memberId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function removeMember(memberId: number): Promise<ApiResponse<null>> {
  return fetchApi<ApiResponse<null>>(`/api/members/${memberId}`, {
    method: "DELETE",
  });
}
