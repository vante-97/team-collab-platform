"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      setSuccess("注册成功！请登录");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const errMsg = await login(username, password);
    if (errMsg) setError(errMsg);
    setLoading(false);
  };

  return (
    <div className="page-bg flex items-center justify-center">
      <div className="w-full max-w-md mx-4 animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 items-center justify-center text-slate-900 dark:text-white text-2xl font-bold mb-4 shadow-xl shadow-purple-500/20">
            T
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">欢迎回来</h1>
          <p className="text-slate-400 dark:text-white/95 mt-1.5 text-base">登录你的 TeamCollab 账号</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8">
          {error && (
            <div className="mb-4 p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl text-red-400 text-base animate-fade-in">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-base animate-fade-in">
              {success}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-slate-400 dark:text-white/95 text-base mb-2">用户名或邮箱</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名或邮箱"
              className="glass-input"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-400 dark:text-white/95 text-base mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="glass-input"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "登录中..." : "登录"}
          </button>

          <p className="text-center text-slate-300 dark:text-white/90 text-base mt-5">
            还没有账号？{" "}
            <Link href="/register" className="text-purple-400 hover:text-purple-300 transition-colors">
              立即注册
            </Link>
          </p>

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.06]">
            <p className="text-slate-300 dark:text-white/90 text-base text-center mb-2">测试账号</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { u: "testuser1", p: "123456", r: "owner" },
                { u: "testuser2", p: "123456", r: "member" },
                { u: "admin", p: "admin123", r: "admin" },
              ].map((acc) => (
                <button
                  key={acc.u}
                  type="button"
                  onClick={() => { setUsername(acc.u); setPassword(acc.p); }}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] text-slate-400 dark:text-white/90 text-base hover:text-slate-500 dark:text-white/85 hover:border-white/10 transition-all text-center"
                >
                  {acc.u}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
