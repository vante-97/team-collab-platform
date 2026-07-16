"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("请填写所有字段");
      return;
    }
    if (username.trim().length < 2) {
      setError("用户名至少2个字符");
      return;
    }
    if (password.length < 8) {
      setError("密码长度至少8位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次密码输入不一致");
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">注册</h1>
          <p className="text-purple-300 mt-2">创建你的 Team Collab Platform 账号</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white 
                           placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="至少2个字符"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white 
                           placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="example@mail.com"
                autoComplete="email"
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
                placeholder="至少8位"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm font-medium mb-1.5">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white 
                           placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                placeholder="请再次输入密码"
                autoComplete="new-password"
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
              {loading ? "注册中..." : "注册"}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            已有账号？{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
