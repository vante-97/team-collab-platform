"use client";

import { useState, useEffect, useCallback } from "react";
import { getStats, type StatsData, type ApiResponse } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth-context";
import Link from "next/link";

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-white/[0.04] rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-white/30 text-xs">{label}</div>
        <div className="text-white text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { isAuthenticated, loading } = useRequireAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    try {
      const res = await getStats() as ApiResponse<StatsData>;
      setStats(res.data || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    }
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      loadStats();
    }
  }, [loading, isAuthenticated, loadStats]);

  if (loading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="glass-card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadStats} className="btn-primary text-sm">重新加载</button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const taskTotal = stats.tasks.todo + stats.tasks.in_progress + stats.tasks.done;
  const projTotal = stats.projects_status.planning + stats.projects_status.active + stats.projects_status.completed;
  const priorityTotal = stats.priority.low + stats.priority.medium + stats.priority.high + stats.priority.urgent;

  return (
    <div className="page-bg">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white">数据统计</h1>
          <p className="text-white/35 text-sm mt-1">团队工作效率概览</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-slide-up">
          <StatCard label="项目总数" value={stats.overview.projects} icon="📁" color="from-purple-500/20 to-violet-500/20" />
          <StatCard label="任务总数" value={stats.overview.tasks} icon="📋" color="from-blue-500/20 to-cyan-500/20" />
          <StatCard label="团队成员" value={stats.overview.members} icon="👥" color="from-emerald-500/20 to-teal-500/20" />
          <StatCard label="文件数" value={stats.overview.files} icon="📄" color="from-orange-500/20 to-amber-500/20" />
          <StatCard label="用户数" value={stats.overview.users} icon="👤" color="from-pink-500/20 to-rose-500/20" />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Task Status */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-white font-semibold mb-5">任务状态分布</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/40">待办</span>
                  <span className="text-yellow-400">{stats.tasks.todo}</span>
                </div>
                <ProgressBar value={stats.tasks.todo} max={taskTotal} color="bg-yellow-400" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/40">进行中</span>
                  <span className="text-blue-400">{stats.tasks.in_progress}</span>
                </div>
                <ProgressBar value={stats.tasks.in_progress} max={taskTotal} color="bg-blue-400" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/40">已完成</span>
                  <span className="text-emerald-400">{stats.tasks.done}</span>
                </div>
                <ProgressBar value={stats.tasks.done} max={taskTotal} color="bg-emerald-400" />
              </div>
            </div>
            {/* Donut-like summary */}
            <div className="mt-5 pt-4 border-t border-white/[0.04] flex justify-center gap-6">
              <div className="text-center">
                <div className="text-emerald-400 text-xl font-bold">
                  {taskTotal > 0 ? Math.round((stats.tasks.done / taskTotal) * 100) : 0}%
                </div>
                <div className="text-white/25 text-xs">完成率</div>
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-xl font-bold">
                  {taskTotal > 0 ? Math.round((stats.tasks.in_progress / taskTotal) * 100) : 0}%
                </div>
                <div className="text-white/25 text-xs">进行率</div>
              </div>
            </div>
          </div>

          {/* Project Status */}
          <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-white font-semibold mb-5">项目状态分布</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/40">规划中</span>
                  <span className="text-purple-400">{stats.projects_status.planning}</span>
                </div>
                <ProgressBar value={stats.projects_status.planning} max={projTotal} color="bg-purple-400" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/40">进行中</span>
                  <span className="text-blue-400">{stats.projects_status.active}</span>
                </div>
                <ProgressBar value={stats.projects_status.active} max={projTotal} color="bg-blue-400" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/40">已完成</span>
                  <span className="text-emerald-400">{stats.projects_status.completed}</span>
                </div>
                <ProgressBar value={stats.projects_status.completed} max={projTotal} color="bg-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="glass-card p-6 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-white font-semibold mb-5">任务优先级分布</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: "urgent", label: "紧急", color: "text-red-400", bg: "bg-red-400" },
              { key: "high", label: "高", color: "text-orange-400", bg: "bg-orange-400" },
              { key: "medium", label: "中", color: "text-yellow-400", bg: "bg-yellow-400" },
              { key: "low", label: "低", color: "text-emerald-400", bg: "bg-emerald-400" },
            ].map((item) => {
              const val = stats.priority[item.key as keyof typeof stats.priority];
              return (
                <div key={item.key} className="text-center">
                  <div className={`text-2xl font-bold ${item.color}`}>{val}</div>
                  <div className="text-white/25 text-xs mt-1">{item.label}</div>
                  <div className="mt-2">
                    <ProgressBar value={val} max={priorityTotal} color={item.bg} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-3 justify-center animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <Link href="/projects" className="btn-secondary text-sm">项目管理</Link>
          <Link href="/tasks" className="btn-secondary text-sm">任务看板</Link>
          <Link href="/files" className="btn-secondary text-sm">文件管理</Link>
          <Link href="/team" className="btn-secondary text-sm">团队协作</Link>
        </div>
      </div>
    </div>
  );
}
