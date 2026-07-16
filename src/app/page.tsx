"use client";

import { useState, useEffect, useCallback } from "react";
import { checkHealth, getHome, getUsers, User } from "@/lib/api";

type ConnectionStatus = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [health, setHealth] = useState<Record<string, string> | null>(null);
  const [homeMsg, setHomeMsg] = useState<string>("");
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"health" | "users">("health");

  const testConnection = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const [healthData, homeData, usersData] = await Promise.all([
        checkHealth(),
        getHome(),
        getUsers(),
      ]);
      setHealth(healthData as unknown as Record<string, string>);
      setHomeMsg((homeData as unknown as Record<string, string>).message || "");
      setUsers(usersData);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Team Collab Platform
          </h1>
          <p className="text-purple-300 text-lg">
            全栈项目开发环境 · Next.js 14 + Flask 3.0
          </p>
        </div>

        {/* Connection Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              前后端连通性测试
            </h2>
            <button
              onClick={testConnection}
              disabled={status === "loading"}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 
                         text-white rounded-lg transition-colors text-sm font-medium"
            >
              {status === "loading" ? "测试中..." : "重新测试"}
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-white/80">连接状态：</span>
            <StatusBadge status={status} />
          </div>

          {/* Home API Message */}
          {homeMsg && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
              <p className="text-emerald-300 text-sm font-medium">{homeMsg}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm">{error}</p>
              <p className="text-red-400 text-xs mt-1">
                请确保后端已启动：cd backend && python app.py
              </p>
            </div>
          )}

          {/* Tabs */}
          {status === "success" && (
            <>
              <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1">
                <TabButton
                  active={activeTab === "health"}
                  onClick={() => setActiveTab("health")}
                >
                  健康检查
                </TabButton>
                <TabButton
                  active={activeTab === "users"}
                  onClick={() => setActiveTab("users")}
                >
                  用户列表
                </TabButton>
              </div>

              {/* Health Info */}
              {activeTab === "health" && health && (
                <div className="space-y-3">
                  {Object.entries(health).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <span className="text-white/70 capitalize">{key}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Users List */}
              {activeTab === "users" && (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-white/50 text-sm">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tech Stack */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <TechBadge label="Next.js 14" color="bg-black/40" />
          <TechBadge label="TypeScript" color="bg-blue-600/40" />
          <TechBadge label="Tailwind CSS" color="bg-cyan-600/40" />
          <TechBadge label="Flask 3.0" color="bg-red-600/40" />
          <TechBadge label="SQLAlchemy" color="bg-orange-600/40" />
          <TechBadge label="SQLite" color="bg-teal-600/40" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ConnectionStatus }) {
  const config = {
    idle: { text: "未测试", className: "bg-gray-500/20 text-gray-300" },
    loading: { text: "测试中...", className: "bg-yellow-500/20 text-yellow-300" },
    success: { text: "已连接", className: "bg-emerald-500/20 text-emerald-300" },
    error: { text: "连接失败", className: "bg-red-500/20 text-red-300" },
  };
  const { text, className } = config[status];
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {status === "loading" && (
        <span className="inline-block w-3 h-3 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin mr-1.5 align-middle" />
      )}
      {text}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
        active
          ? "bg-purple-600 text-white"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

function TechBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white/80 ${color} backdrop-blur-sm`}>
      {label}
    </span>
  );
}
