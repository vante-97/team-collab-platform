"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireAuth, useAuth } from "@/lib/auth-context";
import { getProjects, getTasks, createTask, moveTask, deleteTask, updateTask, getMembers, Project, Task, TeamMember } from "@/lib/api";

const COLUMNS = [
  { key: "todo", label: "待办", icon: "○", color: "border-slate-500/20", bg: "bg-slate-500/[0.02]", dot: "bg-slate-400" },
  { key: "in_progress", label: "进行中", icon: "◐", color: "border-blue-500/20", bg: "bg-blue-500/[0.02]", dot: "bg-blue-400" },
  { key: "done", label: "已完成", icon: "●", color: "border-emerald-500/20", bg: "bg-emerald-500/[0.02]", dot: "bg-emerald-400" },
];

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: "紧急", color: "text-red-400 bg-red-500/10" },
  high: { label: "高", color: "text-orange-400 bg-orange-500/10" },
  medium: { label: "中", color: "text-yellow-400 bg-yellow-500/10" },
  low: { label: "低", color: "text-slate-400 bg-slate-500/10" },
};

export default function TasksPage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 创建任务
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newAssignee, setNewAssignee] = useState<number | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  // 拖拽状态
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // 加载项目列表
  useEffect(() => {
    if (!isAuthenticated) return;
    getProjects().then((res) => {
      if (res.code === 200 && res.data && res.data.length > 0) {
        setProjects(res.data);
        setSelectedProject((prev) => prev ?? res.data[0].id);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 加载成员
  useEffect(() => {
    if (!selectedProject) return;
    getMembers(selectedProject).then((res) => {
      if (res.code === 200) setMembers(res.data || []);
    }).catch(() => {});
  }, [selectedProject]);

  // 加载任务
  const fetchTasks = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    setError("");
    try {
      const res = await getTasks(selectedProject);
      if (res.code === 200) setTasks(res.data || []);
      else setError(res.message || "加载失败");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) fetchTasks();
  }, [selectedProject, fetchTasks]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedProject) return;
    setCreating(true);
    try {
      const res = await createTask(selectedProject, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        assignee_id: newAssignee,
      });
      if (res.code === 201 || res.code === 200) {
        setTasks((prev) => [res.data, ...prev]);
        setShowCreate(false);
        setNewTitle("");
        setNewDesc("");
        setNewPriority("medium");
        setNewAssignee(undefined);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDragStart = (task: Task) => setDraggedTask(task);

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverCol(colKey);
  };

  const handleDrop = async (colKey: string) => {
    setDragOverCol(null);
    if (!draggedTask || draggedTask.status === colKey) return;

    setTasks((prev) => prev.map((t) => (t.id === draggedTask.id ? { ...t, status: colKey as Task["status"] } : t)));
    try {
      await moveTask(draggedTask.id, colKey);
    } catch {
      fetchTasks();
    }
    setDraggedTask(null);
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm("确定删除此任务？")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleAssign = async (taskId: number, assigneeId: number | undefined) => {
    try {
      await updateTask(taskId, { assignee_id: assigneeId });
      const assigneeName = assigneeId ? members.find((m) => m.user_id === assigneeId)?.username || null : null;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, assignee_id: assigneeId ?? null, assignee_name: assigneeName } : t)));
    } catch {
      // ignore
    }
  };

  const getColTasks = (colKey: string) => tasks.filter((t) => t.status === colKey);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-bg">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="page-header animate-fade-in">
          <div>
            <h1 className="page-title">任务看板</h1>
            <p className="page-subtitle">看板式任务管理 · 拖拽移动 · 分配成员</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedProject ?? ""}
              onChange={(e) => setSelectedProject(Number(e.target.value))}
              className="glass-select text-sm"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
              ))}
            </select>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm whitespace-nowrap min-w-[110px]">+ 新建任务</button>
          </div>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-5">新建任务</h2>
              <input type="text" placeholder="任务标题" value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)} className="glass-input mb-3" autoFocus />
              <textarea placeholder="任务描述（可选）" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)} rows={2} className="glass-input mb-3 resize-none" />

              <div className="mb-3">
                <label className="block text-white/40 text-sm mb-2">优先级</label>
                <div className="flex gap-2">
                  {Object.entries(PRIORITY_MAP).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => setNewPriority(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${val.color} ${
                        newPriority === key ? "ring-2 ring-purple-500/40 border-transparent" : "border-transparent opacity-50 hover:opacity-80"
                      }`}>{val.label}</button>
                  ))}
                </div>
              </div>

              {members.length > 0 && (
                <div className="mb-5">
                  <label className="block text-white/40 text-sm mb-2">指派给</label>
                  <select value={newAssignee ?? ""} onChange={(e) => setNewAssignee(e.target.value ? Number(e.target.value) : undefined)}
                    className="glass-select text-sm">
                    <option value="" className="bg-slate-800">不分配</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id} className="bg-slate-800">{m.username}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="btn-secondary text-sm">取消</button>
                <button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="btn-primary text-sm">
                  {creating ? "创建中..." : "确认创建"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-6 glass-card text-center mb-6 animate-fade-in">
            <p className="text-red-400 mb-3">{error}</p>
            <button onClick={fetchTasks} className="btn-primary text-sm">重试</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="spinner" />
            <span className="ml-3 text-white/25 text-sm">加载中...</span>
          </div>
        )}

        {/* Kanban Board */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up">
            {COLUMNS.map((col) => {
              const colTasks = getColTasks(col.key);
              const isOver = dragOverCol === col.key;
              return (
                <div key={col.key}
                  className={`rounded-2xl border ${col.color} ${col.bg} ${isOver ? "ring-2 ring-purple-500/30" : ""} transition-all duration-200`}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={() => handleDrop(col.key)}>

                  <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-sm">{col.icon}</span>
                      <h3 className="text-white/70 font-medium text-sm">{col.label}</h3>
                      <span className="text-white/15 text-xs ml-1">{colTasks.length}</span>
                    </div>
                  </div>

                  <div className="px-3 pb-3 space-y-2 min-h-[200px]">
                    {colTasks.map((task) => {
                      const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                      return (
                        <div key={task.id} draggable onDragStart={() => handleDragStart(task)}
                          className="glass-card p-4 cursor-grab active:cursor-grabbing hover:border-white/[0.15] transition-all duration-200 group">

                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-white/85 text-sm font-medium leading-snug flex-1">{task.title}</h4>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${pri.color}`}>{pri.label}</span>
                          </div>
                          {task.description && (
                            <p className="text-white/20 text-xs mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            {/* Assignee selector */}
                            <div className="relative group/assign">
                              <select
                                value={task.assignee_id ?? ""}
                                onChange={(e) => handleAssign(task.id, e.target.value ? Number(e.target.value) : undefined)}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] bg-transparent text-white/25 hover:text-white/50 border-none outline-none cursor-pointer appearance-none pr-3"
                              >
                                <option value="" className="bg-slate-800 text-white/40">未分配</option>
                                {members.map((m) => (
                                  <option key={m.user_id} value={m.user_id} className="bg-slate-800 text-white/70">{m.username}</option>
                                ))}
                              </select>
                              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-white/15 pointer-events-none text-[8px]">▼</span>
                            </div>
                            <button onClick={() => handleDelete(task.id)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400/50 hover:text-red-400 transition-all">
                              删除
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {colTasks.length === 0 && (
                      <div className="text-center py-10 text-white/8 text-sm">
                        拖拽任务到此处
                      </div>
                    )}
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
