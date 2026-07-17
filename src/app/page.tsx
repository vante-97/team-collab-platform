"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStats, getProjects, getTasks, type StatsData, type Project, type Task } from "@/lib/api";
import Link from "next/link";

const features = [
  { icon: "📋", title: "项目管理", desc: "创建和管理团队项目", href: "/projects", color: "from-purple-500/20 to-violet-500/20", bgIcon: "bg-purple-500/10" },
  { icon: "📌", title: "任务看板", desc: "看板式任务跟踪管理", href: "/tasks", color: "from-blue-500/20 to-cyan-500/20", bgIcon: "bg-blue-500/10" },
  { icon: "👥", title: "团队协作", desc: "邀请成员，分配角色权限", href: "/team", color: "from-emerald-500/20 to-teal-500/20", bgIcon: "bg-emerald-500/10" },
  { icon: "📂", title: "文件管理", desc: "上传、预览项目文件", href: "/files", color: "from-orange-500/20 to-amber-500/20", bgIcon: "bg-orange-500/10" },
  { icon: "📊", title: "数据统计", desc: "团队效率可视化分析", href: "/stats", color: "from-pink-500/20 to-rose-500/20", bgIcon: "bg-pink-500/10" },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    try {
      const [statsRes, projectsRes] = await Promise.all([
        getStats(),
        getProjects(),
      ]);
      if (statsRes.code === 200) setStats(statsRes.data || null);
      if (projectsRes.code === 200 && projectsRes.data) {
        setRecentProjects(projectsRes.data.slice(0, 3));

        // Load tasks for the first active project
        const activeProject = projectsRes.data.find((p: Project) => p.status === "active") || projectsRes.data[0];
        if (activeProject) {
          const { getTasks: fetchTasks } = await import("@/lib/api");
          const tasksRes = await fetchTasks(activeProject.id);
          if (tasksRes.code === 200) setRecentTasks((tasksRes.data || []).slice(0, 5));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="page-bg">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">系统运行中</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            {isAuthenticated ? `欢迎回来，${user?.username}` : "Team Collab Platform"}
          </h1>
          <p className="text-white/35 text-lg max-w-md mx-auto">
            全栈团队协作平台 · 高效管理 · 智能追踪
          </p>
        </div>

        {!isAuthenticated ? (
          /* Guest: Feature Showcase + CTA */
          <>
            <div className="grid gap-5 md:grid-cols-3 mb-12 animate-slide-up stagger">
              {features.slice(0, 3).map((f) => (
                <div key={f.title} className="glass-card p-6 text-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mx-auto mb-4`}>
                    {f.icon}
                  </div>
                  <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                  <p className="text-white/30 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="flex gap-3 justify-center">
                <Link href="/login" className="btn-primary text-sm px-8">立即登录</Link>
                <Link href="/register" className="btn-secondary text-sm px-8">注册账号</Link>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {["Next.js 14", "TypeScript", "Tailwind CSS", "Flask 3.0", "SQLAlchemy", "SQLite"].map((tech) => (
                  <span key={tech} className="px-3 py-1 rounded-full text-xs font-medium text-white/25 bg-white/[0.02] border border-white/[0.04] hover:text-white/45 hover:border-white/10 transition-colors">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : (
          /* Authenticated: Dashboard */
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="glass-card p-6 animate-slide-up">
              <h2 className="text-white font-semibold mb-4">快捷操作</h2>
              <div className="grid gap-3 md:grid-cols-5">
                {features.map((f) => (
                  <Link key={f.href} href={f.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all duration-200 group">
                    <div className={`w-10 h-10 rounded-xl ${f.bgIcon} flex items-center justify-center text-lg group-hover:scale-110 transition-transform duration-200`}>
                      {f.icon}
                    </div>
                    <span className="text-white/50 text-xs group-hover:text-white/80 transition-colors">{f.title}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats Overview */}
            {stats && (
              <div className="grid gap-4 grid-cols-2 md:grid-cols-5 stagger">
                {[
                  { label: "项目总数", value: stats.overview.projects, icon: "📁", color: "bg-purple-500/10" },
                  { label: "任务总数", value: stats.overview.tasks, icon: "📋", color: "bg-blue-500/10" },
                  { label: "团队成员", value: stats.overview.members, icon: "👥", color: "bg-emerald-500/10" },
                  { label: "文件数", value: stats.overview.files, icon: "📄", color: "bg-orange-500/10" },
                  { label: "已完成任务", value: stats.tasks.done, icon: "✓", color: "bg-pink-500/10" },
                ].map((item) => (
                  <div key={item.label} className="glass-card p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-lg flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-white/25 text-[11px]">{item.label}</div>
                      <div className="text-white text-xl font-bold">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Two-column: Recent Projects + Recent Tasks */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Projects */}
              <div className="glass-card p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold">最近项目</h2>
                  <Link href="/projects" className="text-purple-400/70 hover:text-purple-400 text-xs transition-colors">查看全部 →</Link>
                </div>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/20 text-sm mb-3">暂无项目</p>
                    <Link href="/projects" className="btn-primary text-xs">创建第一个项目</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentProjects.map((proj) => {
                      const statusLabels: Record<string, { c: string }> = {
                        active: { c: "text-emerald-400 bg-emerald-500/10" },
                        planning: { c: "text-blue-400 bg-blue-500/10" },
                        completed: { c: "text-gray-400 bg-gray-500/10" },
                        archived: { c: "text-orange-400 bg-orange-500/10" },
                      };
                      const sl = statusLabels[proj.status] || statusLabels.planning;
                      return (
                        <Link key={proj.id} href={`/projects/${proj.id}`}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center text-sm flex-shrink-0">
                              📁
                            </div>
                            <div className="min-w-0">
                              <p className="text-white/80 text-sm truncate group-hover:text-white transition-colors">{proj.name}</p>
                              <p className="text-white/20 text-xs">
                                {new Date(proj.created_at).toLocaleDateString("zh-CN")}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium flex-shrink-0 ${sl.c}`}>
                            {proj.status === "active" ? "进行中" : proj.status === "planning" ? "规划中" : proj.status === "completed" ? "已完成" : "已归档"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Tasks */}
              <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-white font-semibold">近期任务</h2>
                  <Link href="/tasks" className="text-purple-400/70 hover:text-purple-400 text-xs transition-colors">查看全部 →</Link>
                </div>
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/20 text-sm mb-3">暂无任务</p>
                    <Link href="/tasks" className="btn-primary text-xs">创建第一个任务</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTasks.map((task) => {
                      const priColors: Record<string, string> = {
                        urgent: "text-red-400",
                        high: "text-orange-400",
                        medium: "text-yellow-400",
                        low: "text-slate-400",
                      };
                      const statusIcons: Record<string, string> = {
                        todo: "○",
                        in_progress: "◐",
                        done: "●",
                      };
                      return (
                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                          <span className={`text-sm flex-shrink-0 ${task.status === "done" ? "text-emerald-400" : task.status === "in_progress" ? "text-blue-400" : "text-white/30"}`}>
                            {statusIcons[task.status] || "○"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${task.status === "done" ? "text-white/40 line-through" : "text-white/75"}`}>
                              {task.title}
                            </p>
                          </div>
                          <span className={`text-[10px] font-medium flex-shrink-0 ${priColors[task.priority] || "text-slate-400"}`}>
                            {task.priority === "urgent" ? "紧急" : task.priority === "high" ? "高" : task.priority === "medium" ? "中" : "低"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tech stack footer */}
            <div className="flex flex-wrap justify-center gap-2 pt-4">
              {["Next.js 14", "TypeScript", "Tailwind CSS", "Flask 3.0", "SQLAlchemy", "SQLite"].map((tech) => (
                <span key={tech} className="px-3 py-1 rounded-full text-xs font-medium text-white/20 bg-white/[0.02] border border-white/[0.04] hover:text-white/40 hover:border-white/10 transition-colors">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
