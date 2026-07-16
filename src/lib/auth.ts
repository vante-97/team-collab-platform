const API_BASE = "http://localhost:5000";

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface LoginData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

export function saveTokens(access: string, refresh: string): void {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  // 同时写 cookie，让 middleware 能读取
  document.cookie = `access_token=${access}; path=/; max-age=3600; SameSite=Lax`;
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  document.cookie = "access_token=; path=/; max-age=0";
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `请求失败 (${res.status})`);
  }
  return data as ApiResponse<T>;
}

export async function login(
  username: string,
  password: string
): Promise<LoginData> {
  const res = await authFetch<LoginData>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  saveTokens(res.data.access_token, res.data.refresh_token);
  return res.data;
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<RegisterData> {
  const res = await authFetch<RegisterData>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<User> {
  const res = await authFetch<User>("/api/auth/me");
  return res.data;
}
