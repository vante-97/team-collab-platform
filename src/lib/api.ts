const API_BASE = "http://localhost:5000";

export interface ApiResponse<T = unknown> {
  status: string;
  message?: string;
  data?: T;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function checkHealth(): Promise<ApiResponse> {
  return fetchApi<ApiResponse>("/api/health");
}

export async function getHome(): Promise<ApiResponse> {
  return fetchApi<ApiResponse>("/");
}

export async function getUsers(): Promise<User[]> {
  return fetchApi<User[]>("/api/users");
}
