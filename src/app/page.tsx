"use client";

import { useState, useEffect, useCallback } from "react";
import { checkHealth, getHome } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type ConnectionStatus = "idle" | "loading" | "success" | "error";

const features = [
  { icon: "📋", title: "项目管理", desc: "创建和管理团队项目", href: "/projects", color: "from-purple-500/20 to-violet-500/20" },
  { icon: "📌", title: "任务看板", desc: "看板式任务跟踪管理", href: "/tasks", color: "from-blue-500/20 to-cyan-500/20" },
  { icon: "👥", title: "团队协作", desc: "邀请成员，分配角色权限", href: "/team", color: "from-emerald-500/20 to-teal-500/20" },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [health, setHealth] = useState<Record<string, string> | null>(null);
  const [homeMsg, setHomeMsg] = useState<string>("");
  const [error, setError] = useState<string>("");

  const testConnection = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const [healthRes, homeRes] = await Promise.all([checkHealth(), getHome()]);
      setHealth(healthRes.data as unknown as Record<string, string>);
      setHomeMsg(homeRes.message || "");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "未知错误");
    }
  }, []);

  useEffect(() => {
    testConnection();
  }, [testConnection]);

  return (
    <div className="page-bg">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">系统运行中</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            {isAuthenticated ? `欢迎回来，${user?.username}` : "Team Collab Platform"}
          </h1>
          <p className="text-white/40 text-lg max-w-md mx-auto">
            全栈团队协作平台 · AI 驱动开发 · 高效交付
          </p>
        </div>

        {/* Feature Cards */}
        {isAuthenticated && (
          <div className="grid gap-5 md:grid-cols-3 mb-12 animate-slide-up">
            {features.map((f, i) => (
              <Link
                key={f.title}
                href={f.href}
                className="glass-card p-6 group cursor-pointer transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {f.icon}
                </div>
                <h3 className="text-white font-semibold mb-1.5">{f.title}</h3>
                <p className="text-white/35 text-sm leading-relaxed">{f.desc}</p>
              </Link>
            ))}
          </div>
        )}

        {/* System Status Card */}
        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold text-lg">系统状态</h2>
              <p className="text-white/30 text-sm mt-0.5">前后端连通性监控</p>
            </div>
            <button
              onClick={testConnection}
              disabled={status === "loading"}
              className="btn-primary text-sm"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  检测中
                </span>
              ) : (
                "重新检测"
              )}
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-white/50 text-sm">连接状态</span>
            <StatusBadge status={status} />
          </div>

          {homeMsg && (
            <div className="mb-6 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-300/80 text-sm">{homeMsg}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-red-300/80 text-sm">{error}</p>
              <p className="text-red-400/50 text-xs mt-1">cd backend && python app.py</p>
            </div>
          )}

          {status === "success" && health && (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(health).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                  <span className="text-white/40 text-sm capitalize">{key}</span>
                  <span className={`text-sm font-medium ${value === "connected" ? "text-emerald-400" : "text-red-400"}`}>
                    {value === "connected" ? "✓ 正常" : value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!isAuthenticated && status === "success" && (
            <div className="flex gap-3 mt-6 pt-6 border-t border-white/[0.06]">
              <Link href="/login" className="btn-primary flex-1 text-center text-sm">登录</Link>
              <Link href="/register" className="btn-secondary flex-1 text-center text-sm">注册账号</Link>
            </div>
          )}
        </div>

        {/* Tech stack */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {["Next.js 14", "TypeScript", "Tailwind CSS", "Flask 3.0", "SQLAlchemy", "SQLite"].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1 rounded-full text-xs font-medium text-white/30 bg-white/[0.02] border border-white/[0.04] hover:text-white/50 hover:border-white/10 transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    idle: { text: "未检测", className: "bg-gray-500/15 text-gray-400 border-gray-500/25" },
    loading: {
      text: "检测中",
      className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
      loading: true,
    },
    success: { text: "已连接", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" },
    error: { text: "连接失败", className: "bg-red-500/15 text-red-400 border-red-500/25" },
  };
  const cfg = config[status] as { text: string; className: string; loading?: boolean };
  return (
    <span className={`status-badge ${cfg.className}`}>
      {cfg.loading && (
        <span className="w-2.5 h-2.5 border-2 border-yellow-400/50 border-t-yellow-400 rounded-full animate-spin" />
      )}
      {cfg.text}
    </span>
  );
}
