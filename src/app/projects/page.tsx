"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireAuth } from "@/lib/auth-context";
import { getProjects, createProject, deleteProject, Project } from "@/lib/api";

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  planning: { label: "规划中", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  active: { label: "进行中", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  completed: { label: "已完成", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", dot: "bg-gray-400" },
  archived: { label: "已归档", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
};

export default function ProjectsPage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStatus, setNewStatus] = useState("planning");
  const [creating, setCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getProjects();
      if (res.code === 200) setProjects(res.data || []);
      else setError(res.message || "加载失败");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchProjects();
  }, [isAuthenticated, fetchProjects]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定要删除项目「${name}」吗？`)) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createProject({ name: newName.trim(), description: newDesc.trim(), status: newStatus });
      if (res.code === 201 || res.code === 200) {
        setProjects((prev) => [res.data, ...prev]);
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
        setNewStatus("planning");
      } else {
        alert(res.message || "创建失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-bg">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-white">项目管理</h1>
            <p className="text-white/30 text-sm mt-1">共 {projects.length} 个项目</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            + 创建项目
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowCreate(false)}>
            <div className="glass-card p-6 w-full max-w-md mx-4 border-white/[0.12] animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-5">创建新项目</h2>
              <input
                type="text"
                placeholder="项目名称"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="glass-input mb-3"
                autoFocus
              />
              <textarea
                placeholder="项目描述（可选）"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="glass-input mb-3 resize-none"
              />
              <div className="mb-5">
                <label className="block text-white/50 text-sm mb-2">初始状态</label>
                <div className="flex gap-2">
                  {["planning", "active"].map((s) => {
                    const st = STATUS_MAP[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewStatus(s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${st.color} ${newStatus === s ? "ring-2 ring-purple-500/40" : "opacity-60 hover:opacity-100"}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">取消</button>
                <button onClick={handleCreate} disabled={!newName.trim() || creating} className="btn-primary text-sm">
                  {creating ? "创建中..." : "确认创建"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-white/30 text-sm">加载中...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-8 glass-card text-center animate-fade-in">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={fetchProjects} className="btn-primary text-sm">重试</button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-5xl mb-4 opacity-30">📁</div>
            <p className="text-white/25 text-lg mb-6">还没有项目，创建一个开始吧</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              创建第一个项目
            </button>
          </div>
        )}

        {/* Project Grid */}
        {!loading && !error && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((proj, i) => {
              const statusInfo = STATUS_MAP[proj.status] || STATUS_MAP.planning;
              return (
                <div
                  key={proj.id}
                  className="glass-card p-5 group cursor-pointer transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-semibold truncate flex-1 mr-2">{proj.name}</h3>
                    <span className={`status-badge shrink-0 ${statusInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      {statusInfo.label}
                    </span>
                  </div>
                  {proj.description ? (
                    <p className="text-white/30 text-sm mb-4 line-clamp-2">{proj.description}</p>
                  ) : (
                    <p className="text-white/10 text-sm mb-4 italic">暂无描述</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-white/20 text-xs">
                      {new Date(proj.created_at).toLocaleDateString("zh-CN")}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(proj.id, proj.name); }}
                      className="opacity-0 group-hover:opacity-100 btn-danger text-xs transition-all duration-200"
                    >
                      删除
                    </button>
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
