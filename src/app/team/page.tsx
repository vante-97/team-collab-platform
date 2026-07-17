"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireAuth, useAuth } from "@/lib/auth-context";
import { getProjects, getMembers, addMember, updateMemberRole, removeMember, TeamMember, Project } from "@/lib/api";

const ROLE_MAP: Record<string, { label: string; color: string }> = {
  owner: { label: "拥有者", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  admin: { label: "管理员", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  member: { label: "成员", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  viewer: { label: "观察者", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

export default function TeamPage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // 加载项目
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
  const fetchMembers = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    setError("");
    setMembers([]);
    try {
      const res = await getMembers(selectedProject);
      if (res.code === 200) setMembers(res.data || []);
      else setError(res.message || "加载失败");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) fetchMembers();
  }, [selectedProject, fetchMembers]);

  const handleAddMember = async () => {
    if (!newUsername.trim() || !selectedProject) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await addMember(selectedProject, { username: newUsername.trim(), role: newRole });
      if (res.code === 201 || res.code === 200) {
        setMembers((prev) => [...prev, res.data]);
        setShowAdd(false);
        setNewUsername("");
        setNewRole("member");
      } else {
        setAddError(res.message || "添加失败");
      }
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (memberId: number, role: TeamMember["role"]) => {
    try {
      await updateMemberRole(memberId, role);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新失败");
    }
  };

  const handleRemove = async (memberId: number, username: string) => {
    if (!confirm(`确定要移除成员「${username}」吗？`)) return;
    try {
      await removeMember(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "移除失败");
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const currentUserMember = members.find((m) => m.username === user?.username);
  const canManage = currentUserMember?.role === "owner" || currentUserMember?.role === "admin";

  return (
    <div className="page-bg">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="page-header animate-fade-in">
          <div>
            <h1 className="page-title">团队协作</h1>
            <p className="page-subtitle">管理项目成员与权限</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedProject ?? ""}
              onChange={(e) => setSelectedProject(Number(e.target.value))}
              className="glass-select text-sm min-w-[140px]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
              ))}
            </select>
            {canManage && (
              <button onClick={() => { setShowAdd(true); setAddError(""); }} className="btn-primary text-sm whitespace-nowrap flex-shrink-0">+ 添加成员</button>
            )}
          </div>
        </div>

        {/* Permission Hint */}
        <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] animate-fade-in">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <span className="text-purple-400">🔒</span>
            <span>
              当前身份：
              <span className="text-white/70 font-medium ml-1">
                {ROLE_MAP[currentUserMember?.role]?.label || "成员"}
              </span>
              {canManage ? (
                <span className="ml-2 text-emerald-400/80">拥有添加/移除成员和修改角色权限</span>
              ) : (
                <span className="ml-2 text-white/30">仅可查看成员列表</span>
              )}
            </span>
          </div>
        </div>

        {/* Add Member Modal */}
        {showAdd && (
          <div className="modal-overlay" onClick={() => setShowAdd(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-semibold text-white mb-5">添加团队成员</h2>
              {addError && (
                <div className="mb-3 p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400 text-sm">{addError}</div>
              )}
              <input type="text" placeholder="输入用户名" value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)} className="glass-input mb-3" autoFocus />
              <div className="mb-5">
                <label className="block text-white/40 text-sm mb-2">角色</label>
                <div className="flex gap-2">
                  {["admin", "member", "viewer"].map((r) => {
                    const roleInfo = ROLE_MAP[r];
                    return (
                      <button key={r} type="button" onClick={() => setNewRole(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${roleInfo.color} ${
                          newRole === r ? "ring-2 ring-purple-500/40" : "opacity-50 hover:opacity-80"
                        }`}>{roleInfo.label}</button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">取消</button>
                <button onClick={handleAddMember} disabled={!newUsername.trim() || adding} className="btn-primary text-sm">
                  {adding ? "添加中..." : "确认添加"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-6 glass-card text-center mb-6 animate-fade-in">
            <p className="text-red-400 mb-3">{error}</p>
            <button onClick={fetchMembers} className="btn-primary text-sm">重试</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="spinner" />
            <span className="ml-3 text-white/25 text-sm">加载中...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && members.length === 0 && (
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">暂无团队成员</div>
            <div className="empty-state-desc mb-4">添加成员开始协作</div>
            {canManage && <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">添加第一个成员</button>}
          </div>
        )}

        {/* Members List */}
        {!loading && !error && members.length > 0 && (
          <div className="glass-card divide-y divide-white/[0.03] overflow-hidden animate-slide-up">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-3 text-white/20 text-xs font-medium">
              <span>成员</span>
              <span>角色</span>
              <span className="text-right">操作</span>
            </div>

            {members.map((member) => {
              const roleInfo = ROLE_MAP[member.role] || ROLE_MAP.member;
              const isMe = member.username === user?.username;
              return (
                <div key={member.id} className="flex flex-col md:grid md:grid-cols-[1fr_auto_auto] gap-2 md:gap-4 px-4 md:px-6 py-4 items-start md:items-center hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400/20 to-violet-400/20 flex items-center justify-center text-purple-300 text-sm font-bold shrink-0">
                      {member.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm font-medium truncate">
                        {member.username}
                        {isMe && <span className="text-white/15 text-xs ml-1.5">(你)</span>}
                      </p>
                      <p className="text-white/15 text-xs truncate">{member.email}</p>
                    </div>
                  </div>

                  <div className="ml-12 md:ml-0">
                    {canManage && member.role !== "owner" ? (
                      <select value={member.role} onChange={(e) => handleRoleChange(member.id, e.target.value as TeamMember["role"])}
                        className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white/60 focus:outline-none focus:border-purple-500/40 transition-colors cursor-pointer">
                        <option value="admin" className="bg-slate-800">管理员</option>
                        <option value="member" className="bg-slate-800">成员</option>
                        <option value="viewer" className="bg-slate-800">观察者</option>
                      </select>
                    ) : (
                      <span className={`status-badge ${roleInfo.color}`}>{roleInfo.label}</span>
                    )}
                  </div>

                  <div className="ml-12 md:ml-0 md:text-right">
                    {canManage && member.role !== "owner" && (
                      <button onClick={() => handleRemove(member.id, member.username)} className="btn-danger">移除</button>
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
