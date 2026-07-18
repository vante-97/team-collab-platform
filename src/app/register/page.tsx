"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    const errMsg = await register(username, email, password);
    if (errMsg) setError(errMsg);
    setLoading(false);
  };

  return (
    <div className="page-bg flex items-center justify-center">
      <div className="w-full max-w-md mx-4 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 items-center justify-center text-slate-900 dark:text-white text-2xl font-bold mb-4 shadow-xl shadow-purple-500/20">
            T
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">创建账号</h1>
          <p className="text-slate-400 dark:text-white/95 mt-1.5 text-base">加入 TeamCollab 开始协作</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8">
          {error && (
            <div className="mb-4 p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400 text-base animate-fade-in">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-slate-400 dark:text-white/95 text-base mb-2">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="至少3个字符"
              className="glass-input"
              required
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-400 dark:text-white/95 text-base mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="glass-input"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-400 dark:text-white/95 text-base mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6个字符"
              className="glass-input"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 dark:text-white/95 text-base mb-2">确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className="glass-input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "注册中..." : "注册"}
          </button>

          <p className="text-center text-slate-300 dark:text-white/90 text-base mt-5">
            已有账号？{" "}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
              立即登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
