"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { href: "/", label: "仪表盘", icon: "◈" },
  { href: "/projects", label: "项目", icon: "◆" },
  { href: "/tasks", label: "任务", icon: "◫" },
  { href: "/team", label: "团队", icon: "◎" },
  { href: "/files", label: "文件", icon: "◰" },
  { href: "/stats", label: "统计", icon: "⬡" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
              T
            </div>
            <span className="text-white font-semibold text-base tracking-tight">
              TeamCollab
            </span>
          </Link>
          {isAuthenticated && (
            <div className="flex gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-purple-500/15 text-purple-300 font-medium"
                        : "text-white/45 hover:text-white/80 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-[10px]">{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: User + Logout */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-white/60 text-sm hidden sm:inline">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-white/35 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all duration-200"
              >
                退出
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-1.5 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200">
                登录
              </Link>
              <Link href="/register" className="px-4 py-1.5 text-sm bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-lg transition-all duration-200 shadow-lg shadow-purple-600/15">
                注册
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
