"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("请填写所有字段");
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">登录</h1>
          <p className="text-purple-300 mt-2">欢迎回到 Team Collab Platform</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">
                用户名或邮箱
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white 
                           placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="请输入用户名或邮箱"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white 
                           placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed
                         text-white rounded-lg font-medium transition-colors"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            还没有账号？{" "}
            <Link href="/register" className="text-purple-400 hover:text-purple-300">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
