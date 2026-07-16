"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = "http://localhost:5000";

interface Project {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  planning: { label: "规划中", className: "bg-yellow-500/20 text-yellow-300" },
  active: { label: "进行中", className: "bg-emerald-500/20 text-emerald-300" },
  completed: { label: "已完成", className: "bg-blue-500/20 text-blue-300" },
  archived: { label: "已归档", className: "bg-gray-500/20 text-gray-300" },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch(`${API_BASE}/api/projects`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 422) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        const json = await res.json().catch(() => null);
        throw new Error(json?.message || `请求失败 (${res.status})`);
      }
      const json: ApiResponse<Project[]> = await res.json();
      setProjects(json.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">项目管理</h1>
            <p className="text-white/50 text-sm mt-1">管理你的所有项目</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              返回仪表盘
            </Link>
            <button
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
              onClick={() => {
                /* TODO: 创建项目 */
              }}
            >
              + 创建项目
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-white/50">
              <span className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              加载中...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl mb-6">
            <p className="text-red-300 text-sm">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-2 text-red-400 text-xs hover:text-red-300 underline"
            >
              点击重试
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-white/50 text-lg mb-2">还没有任何项目</p>
            <p className="text-white/30 text-sm">点击右上角按钮创建第一个项目</p>
          </div>
        )}

        {/* Project Cards */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const statusInfo = STATUS_MAP[project.status] || STATUS_MAP.planning;
              return (
                <div
                  key={project.id}
                  className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-semibold text-lg truncate flex-1 mr-2">
                      {project.name}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <p className="text-white/50 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {project.description || "暂无描述"}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-white/30 text-xs">
                      {new Date(project.updated_at).toLocaleDateString("zh-CN")}
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 text-xs text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                        onClick={() => {
                          /* TODO: 编辑项目 */
                        }}
                      >
                        编辑
                      </button>
                      <button
                        className="px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                        onClick={() => {
                          /* TODO: 删除项目 */
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
