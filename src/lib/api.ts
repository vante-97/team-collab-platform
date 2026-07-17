const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
  // 返回 JSON，由调用方根据 code 字段判断成功/失败
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
): Promise<ApiResponse<Invitation>> {
  return fetchApi<ApiResponse<Invitation>>(`/api/projects/${projectId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function inviteMember(
  projectId: number,
  data: { username: string; role?: string }
): Promise<ApiResponse<Invitation>> {
  return addMember(projectId, data);
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

// ---- 邀请 API ----
export interface Invitation {
  id: number;
  project_id: number;
  project_name: string;
  inviter_id: number;
  inviter_name: string;
  invitee_id: number;
  invitee_name: string;
  role: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface InvitationsData {
  received: Invitation[];
  sent: Invitation[];
}

export async function getInvitations(): Promise<ApiResponse<InvitationsData>> {
  return fetchApi<ApiResponse<InvitationsData>>("/api/invitations");
}

export async function respondInvitation(
  invitationId: number,
  action: "accept" | "reject"
): Promise<ApiResponse<{ member?: TeamMember; invitation: Invitation }>> {
  return fetchApi<ApiResponse<{ member?: TeamMember; invitation: Invitation }>>(
    `/api/invitations/${invitationId}/respond`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }
  );
}

export async function getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
  return fetchApi<ApiResponse<{ count: number }>>("/api/invitations/unread-count");
}

// ---- 文件管理 API ----
export interface ProjectFile {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  file_type: string;
  uploader_id: number;
  uploader_name: string;
  project_id: number;
  created_at: string;
}

export async function getProjectFiles(projectId: number): Promise<ApiResponse<ProjectFile[]>> {
  return fetchApi<ApiResponse<ProjectFile[]>>(`/api/projects/${projectId}/files`);
}

export async function uploadFile(projectId: number, file: File): Promise<ApiResponse<ProjectFile>> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/files`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload Error ${res.status}: ${text}`);
  }
  return res.json();
}

export async function deleteFile(fileId: number): Promise<ApiResponse<null>> {
  return fetchApi<ApiResponse<null>>(`/api/files/${fileId}`, {
    method: "DELETE",
  });
}

export function getFileDownloadUrl(fileId: number): string {
  return `${API_BASE}/api/files/${fileId}/download`;
}

// ---- 数据统计 API ----
export interface StatsData {
  overview: {
    projects: number;
    tasks: number;
    users: number;
    files: number;
    members: number;
  };
  tasks: {
    todo: number;
    in_progress: number;
    done: number;
  };
  projects_status: {
    planning: number;
    active: number;
    completed: number;
  };
  priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export async function getStats(): Promise<ApiResponse<StatsData>> {
  return fetchApi<ApiResponse<StatsData>>("/api/stats");
}
