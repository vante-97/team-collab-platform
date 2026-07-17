"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireAuth, useAuth } from "@/lib/auth-context";
import {
  getProjectById, updateProject, deleteProject,
  getTasks, createTask, moveTask, deleteTask,
  getMembers, addMember, removeMember,
  getProjectFiles, uploadFile, deleteFile, getFileDownloadUrl,
  type Project, type Task, type TeamMember, type ProjectFile,
} from "@/lib/api";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  planning: { label: "规划中", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  active: { label: "进行中", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  completed: { label: "已完成", color: "bg-gray-500/10 text-gray-400 border-gray-500/20", dot: "bg-gray-400" },
  archived: { label: "已归档", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", dot: "bg-orange-400" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: "紧急", color: "text-red-400 bg-red-500/10" },
  high: { label: "高", color: "text-orange-400 bg-orange-500/10" },
  medium: { label: "中", color: "text-yellow-400 bg-yellow-500/10" },
  low: { label: "低", color: "text-slate-400 bg-slate-500/10" },
};

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  owner: { label: "拥有者", color: "bg-purple-500/10 text-purple-400" },
  admin: { label: "管理员", color: "bg-blue-500/10 text-blue-400" },
  member: { label: "成员", color: "bg-emerald-500/10 text-emerald-400" },
  viewer: { label: "观察者", color: "bg-slate-500/10 text-slate-400" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TabKey = "overview" | "tasks" | "members" | "files";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [creatingTask, setCreatingTask] = useState(false);

  // Members state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [addMemberError, setAddMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Files state
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileMsg, setFileMsg] = useState("");

  // Toast
  const [toast, setToast] = useState<{ type: string; text: string } | null>(null);
  const showToast = (type: string, text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Load project
  const loadProject = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getProjectById(projectId);
      if (res.code === 200 && res.data) {
        setProject(res.data);
      } else {
        setError(res.message || "项目不存在");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isAuthenticated && !isNaN(projectId)) loadProject();
  }, [isAuthenticated, projectId, loadProject]);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      const res = await getTasks(projectId);
      if (res.code === 200) setTasks(res.data || []);
    } catch { /* ignore */ }
  }, [projectId]);

  // Load members
  const loadMembers = useCallback(async () => {
    try {
      const res = await getMembers(projectId);
      if (res.code === 200) setMembers(res.data || []);
    } catch { /* ignore */ }
  }, [projectId]);

  // Load files
  const loadFiles = useCallback(async () => {
    try {
      const res = await getProjectFiles(projectId);
      if (res.code === 200) setFiles(res.data || []);
    } catch { /* ignore */ }
  }, [projectId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editName.trim() || !project) return;
    try {
      const res = await updateProject(project.id, { name: editName, description: editDesc, status: editStatus });
      if (res.code === 200) {
        setProject(res.data);
        setEditing(false);
        showToast("success", "项目信息已更新");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "更新失败");
    }
  };

  const startEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description);
    setEditStatus(project.status);
    setEditing(true);
  };

  // Handle delete project
  const handleDeleteProject = async () => {
    if (!confirm(`确定删除项目「${project?.name}」吗？此操作不可撤销！`)) return;
    try {
      await deleteProject(projectId);
      showToast("success", "项目已删除");
      setTimeout(() => router.push("/projects"), 500);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  // Handle create task
  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    setCreatingTask(true);
    try {
      const res = await createTask(projectId, { title: newTaskTitle, priority: newTaskPriority });
      if (res.code === 201 || res.code === 200) {
        setTasks((prev) => [res.data, ...prev]);
        setShowCreateTask(false);
        setNewTaskTitle("");
        showToast("success", "任务已创建");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreatingTask(false);
    }
  };

  // Handle move task
  const handleMoveTask = async (taskId: number, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t)));
    try {
      await moveTask(taskId, newStatus);
    } catch {
      loadTasks();
    }
  };

  // Handle delete task
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("确定删除此任务？")) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast("success", "任务已删除");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  // Handle add member
  const handleAddMember = async () => {
    if (!newMemberName.trim()) return;
    setAddingMember(true);
    setAddMemberError("");
    try {
      const res = await addMember(projectId, { username: newMemberName.trim() });
      if (res.code === 201 || res.code === 200) {
        setMembers((prev) => [...prev, res.data]);
        setShowAddMember(false);
        setNewMemberName("");
        showToast("success", "成员已添加");
      } else {
        setAddMemberError(res.message || "添加失败");
      }
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setAddingMember(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async (memberId: number, username: string) => {
    if (!confirm(`确定移除「${username}」？`)) return;
    try {
      await removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast("success", "成员已移除");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "移除失败");
    }
  };

  // Handle upload file
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileMsg("");
    try {
      await uploadFile(projectId, file);
      showToast("success", `"${file.name}" 上传成功`);
      loadFiles();
    } catch (err) {
      setFileMsg("上传失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setUploading(false);
    }
  };

  // Handle delete file
  const handleDeleteFile = async (fileId: number, name: string) => {
    if (!confirm(`确定删除 "${name}"？`)) return;
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      showToast("success", "文件已删除");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-red-400 mb-4">{error || "项目不存在"}</p>
          <Link href="/projects" className="btn-primary text-sm">返回项目列表</Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[project.status] || STATUS_MAP.planning;
  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const currentMember = members.find((m) => m.username === user?.username);
  const canManage = currentMember?.role === "owner" || currentMember?.role === "admin";

  const tabs: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "overview", label: "概览", icon: "◈" },
    { key: "tasks", label: "任务", icon: "◫", count: tasks.length },
    { key: "members", label: "成员", icon: "◎", count: members.length },
    { key: "files", label: "文件", icon: "◰", count: files.length },
  ];

  return (
    <div className="page-bg">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Toast */}
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.type === "success" && "✓ "}
            {toast.type === "error" && "✗ "}
            {toast.text}
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-6 animate-fade-in">
          <Link href="/projects" className="text-white/30 hover:text-white/60 transition-colors">项目</Link>
          <span className="text-white/15">/</span>
          <span className="text-white/60">{project.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-slide-up">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3 max-w-lg">
                <input
                  type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="glass-input text-lg font-bold" autoFocus
                />
                <textarea
                  value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  className="glass-input resize-none" rows={2}
                />
                <div className="flex gap-2">
                  {["planning", "active", "completed", "archived"].map((s) => {
                    const si = STATUS_MAP[s];
                    return (
                      <button key={s} onClick={() => setEditStatus(s)}
                        className={`status-badge cursor-pointer ${si.color} ${editStatus === s ? "ring-2 ring-purple-500/40" : "opacity-50"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />{si.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveEdit} disabled={!editName.trim()} className="btn-primary text-sm">保存</button>
                  <button onClick={() => setEditing(false)} className="btn-secondary text-sm">取消</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-white">{project.name}</h1>
                  <span className={`status-badge ${statusInfo.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />{statusInfo.label}
                  </span>
                </div>
                <p className="text-white/30 text-sm">{project.description || "暂无描述"}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-white/20">
                  <span>创建于 {new Date(project.created_at).toLocaleDateString("zh-CN")}</span>
                  {project.owner_name && <span>创建者: {project.owner_name}</span>}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!editing && (
              <>
                <button onClick={startEdit} className="btn-secondary text-sm">编辑</button>
                <button onClick={handleDeleteProject} className="btn-danger text-sm">删除</button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.05] animate-slide-up">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] ${
                activeTab === tab.key
                  ? "text-purple-300 border-purple-500"
                  : "text-white/30 border-transparent hover:text-white/50"
              }`}
            >
              <span className="text-xs">{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-white/30">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-slide-up">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger">
              <div className="stat-mini">
                <div className="stat-mini-icon bg-purple-500/10">📋</div>
                <div>
                  <div className="stat-mini-value">{tasks.length}</div>
                  <div className="stat-mini-label">任务总数</div>
                </div>
              </div>
              <div className="stat-mini">
                <div className="stat-mini-icon bg-emerald-500/10">✓</div>
                <div>
                  <div className="stat-mini-value">{doneTasks.length}</div>
                  <div className="stat-mini-label">已完成</div>
                </div>
              </div>
              <div className="stat-mini">
                <div className="stat-mini-icon bg-blue-500/10">👥</div>
                <div>
                  <div className="stat-mini-value">{members.length}</div>
                  <div className="stat-mini-label">团队成员</div>
                </div>
              </div>
              <div className="stat-mini">
                <div className="stat-mini-icon bg-amber-500/10">📄</div>
                <div>
                  <div className="stat-mini-value">{files.length}</div>
                  <div className="stat-mini-label">文件</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="glass-card p-5 md:col-span-2 lg:col-span-4">
                <h3 className="text-white font-medium mb-3 text-sm">任务进度</h3>
                <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
                  {tasks.length > 0 ? (
                    <>
                      <div className="bg-yellow-500/60 transition-all duration-500" style={{ width: `${(todoTasks.length / tasks.length) * 100}%` }} />
                      <div className="bg-blue-500/60 transition-all duration-500" style={{ width: `${(inProgressTasks.length / tasks.length) * 100}%` }} />
                      <div className="bg-emerald-500/60 transition-all duration-500" style={{ width: `${(doneTasks.length / tasks.length) * 100}%` }} />
                    </>
                  ) : (
                    <div className="bg-white/[0.03] w-full" />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-yellow-400/60">待办 {todoTasks.length}</span>
                  <span className="text-blue-400/60">进行中 {inProgressTasks.length}</span>
                  <span className="text-emerald-400/60">已完成 {doneTasks.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === "tasks" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/25 text-sm">共 {tasks.length} 个任务</p>
                <button onClick={() => setShowCreateTask(true)} className="btn-primary text-sm">+ 新建任务</button>
              </div>
              {showCreateTask && (
                <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-lg font-semibold text-white mb-4">新建任务</h2>
                    <input type="text" placeholder="任务标题" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="glass-input mb-3" autoFocus />
                    <div className="mb-4">
                      <label className="block text-white/40 text-sm mb-2">优先级</label>
                      <div className="flex gap-2">
                        {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                          <button key={k} onClick={() => setNewTaskPriority(k)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${v.color} ${newTaskPriority === k ? "ring-2 ring-purple-500/40 border-transparent" : "border-transparent opacity-50 hover:opacity-80"}`}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowCreateTask(false)} className="btn-secondary text-sm">取消</button>
                      <button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || creatingTask} className="btn-primary text-sm">
                        {creatingTask ? "创建中..." : "确认创建"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <div className="empty-state-title">暂无任务</div>
                  <div className="empty-state-desc">创建第一个任务开始追踪进度</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: "todo", label: "待办", tasks: todoTasks, color: "border-slate-500/20 bg-slate-500/[0.02]" },
                    { key: "in_progress", label: "进行中", tasks: inProgressTasks, color: "border-blue-500/20 bg-blue-500/[0.02]" },
                    { key: "done", label: "已完成", tasks: doneTasks, color: "border-emerald-500/20 bg-emerald-500/[0.02]" },
                  ].map((col) => (
                    <div key={col.key} className={`rounded-xl border ${col.color} p-4 min-h-[200px]`}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-white/70 font-medium text-sm">{col.label}</h3>
                        <span className="text-white/20 text-xs">{col.tasks.length}</span>
                      </div>
                      <div className="space-y-2">
                        {col.tasks.map((task) => {
                          const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.medium;
                          return (
                            <div key={task.id} className="glass-card p-3 group">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-white/80 text-sm flex-1">{task.title}</span>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${pri.color}`}>{pri.label}</span>
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex gap-1">
                                  {col.key !== "todo" && (
                                    <button onClick={() => handleMoveTask(task.id, "todo")} className="text-white/15 hover:text-yellow-400 text-[10px] px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-colors">← 待办</button>
                                  )}
                                  {col.key !== "in_progress" && (
                                    <button onClick={() => handleMoveTask(task.id, "in_progress")} className="text-white/15 hover:text-blue-400 text-[10px] px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-colors">进行中</button>
                                  )}
                                  {col.key !== "done" && (
                                    <button onClick={() => handleMoveTask(task.id, "done")} className="text-white/15 hover:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded hover:bg-white/[0.04] transition-colors">完成 ✓</button>
                                  )}
                                </div>
                                <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 text-[10px] transition-all">删除</button>
                              </div>
                            </div>
                          );
                        })}
                        {col.tasks.length === 0 && (
                          <div className="text-center py-8 text-white/10 text-sm">暂无任务</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/25 text-sm">共 {members.length} 位成员</p>
                {canManage && (
                  <button onClick={() => { setShowAddMember(true); setAddMemberError(""); }} className="btn-primary text-sm">+ 添加成员</button>
                )}
              </div>
              {showAddMember && (
                <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-lg font-semibold text-white mb-4">添加团队成员</h2>
                    {addMemberError && <div className="mb-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400 text-sm">{addMemberError}</div>}
                    <input type="text" placeholder="输入用户名" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} className="glass-input mb-4" autoFocus />
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowAddMember(false)} className="btn-secondary text-sm">取消</button>
                      <button onClick={handleAddMember} disabled={!newMemberName.trim() || addingMember} className="btn-primary text-sm">
                        {addingMember ? "添加中..." : "确认添加"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {members.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <div className="empty-state-title">暂无成员</div>
                  <div className="empty-state-desc">添加成员开始协作</div>
                </div>
              ) : (
                <div className="glass-card divide-y divide-white/[0.03] overflow-hidden">
                  {members.map((member) => {
                    const ri = ROLE_MAP[member.role] || ROLE_MAP.member;
                    return (
                      <div key={member.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400/20 to-violet-400/20 flex items-center justify-center text-purple-300 text-sm font-bold">
                            {member.username?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white/80 text-sm font-medium">
                              {member.username}
                              {member.username === user?.username && <span className="text-white/20 text-xs ml-1.5">(你)</span>}
                            </p>
                            <p className="text-white/20 text-xs">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`status-badge ${ri.color}`}>{ri.label}</span>
                          {canManage && member.role !== "owner" && (
                            <button onClick={() => handleRemoveMember(member.id, member.username)} className="btn-danger">移除</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Files Tab */}
          {activeTab === "files" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-white/25 text-sm">共 {files.length} 个文件 · {formatSize(files.reduce((s, f) => s + f.file_size, 0))}</p>
                <label className="btn-primary cursor-pointer text-sm">
                  {uploading ? "上传中..." : "+ 上传文件"}
                  <input type="file" className="hidden" onChange={handleUploadFile} disabled={uploading} />
                </label>
              </div>
              {fileMsg && (
                <div className={`mb-3 p-3 rounded-xl text-sm ${fileMsg.includes("失败") ? "bg-red-500/5 border border-red-500/15 text-red-400" : "bg-emerald-500/5 border border-emerald-500/15 text-emerald-400"}`}>{fileMsg}</div>
              )}
              {files.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📂</div>
                  <div className="empty-state-title">暂无文件</div>
                  <div className="empty-state-desc">上传第一个项目文件</div>
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between px-6 py-3.5 border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xl flex-shrink-0">
                          {file.file_type === "pdf" ? "📄" : file.file_type === "image" ? "🖼️" : file.file_type === "doc" ? "📝" : "📁"}
                        </span>
                        <div className="min-w-0">
                          <button onClick={() => window.open(getFileDownloadUrl(file.id), "_blank")}
                            className="text-white/80 text-sm hover:text-purple-400 truncate transition-colors text-left block w-full">
                            {file.original_name}
                          </button>
                          <span className="text-white/20 text-[11px]">{formatSize(file.file_size)} · {file.uploader_name} · {new Date(file.created_at).toLocaleDateString("zh-CN")}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteFile(file.id, file.original_name)} className="btn-danger">删除</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
