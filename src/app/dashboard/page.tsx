"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout, User } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <p className="text-white/60">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <nav className="bg-white/5 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-white font-bold text-lg">Team Collab Platform</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-2">欢迎回来，{user?.username}</h2>
          <p className="text-white/50 mb-6">{user?.email}</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "我的项目", count: 0, color: "from-blue-500 to-cyan-500" },
              { label: "待办任务", count: 0, color: "from-purple-500 to-pink-500" },
              { label: "团队成员", count: 0, color: "from-emerald-500 to-teal-500" },
            ].map((card) => (
              <div
                key={card.label}
                className={`p-6 rounded-xl bg-gradient-to-br ${card.color} bg-opacity-20`}
              >
                <p className="text-white/80 text-sm">{card.label}</p>
                <p className="text-white text-3xl font-bold mt-2">{card.count}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
