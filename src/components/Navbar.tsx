"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

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
  const [mobileOpen, setMobileOpen] = useState(false);

  // 项目详情页也标记"项目"为活跃
  const isActive = (href: string) => {
    if (href === "/projects" && pathname.startsWith("/projects")) return true;
    if (href === "/" && pathname === "/") return true;
    return pathname === href;
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#050510]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
              T
            </div>
            <span className="text-white font-semibold text-base tracking-tight hidden sm:inline">
              TeamCollab
            </span>
          </Link>

          {/* Desktop Nav */}
          {isAuthenticated && (
            <div className="hidden md:flex gap-1">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
                      active
                        ? "bg-purple-500/15 text-purple-300 font-medium"
                        : "text-white/40 hover:text-white/75 hover:bg-white/[0.04]"
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

        {/* Right: User + Logout (Desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-white/50 text-sm">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-white/30 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all duration-200"
              >
                退出
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-1.5 text-sm text-white/50 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200">
                登录
              </Link>
              <Link href="/register" className="btn-primary text-sm !px-4 !py-1.5">
                注册
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Hamburger + User */}
        <div className="flex md:hidden items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
            >
              <span className={`w-4 h-0.5 bg-white/60 rounded-full transition-all ${mobileOpen ? "rotate-45 translate-y-1" : ""}`} />
              <span className={`w-4 h-0.5 bg-white/60 rounded-full transition-all ${mobileOpen ? "-rotate-45 -translate-y-1" : ""}`} />
            </button>
          )}
          {isAuthenticated && (
            <button onClick={logout} className="text-white/30 text-xs px-2 py-1 hover:text-red-400 transition-colors">
              退出
            </button>
          )}
          {!isAuthenticated && (
            <Link href="/login" className="btn-primary text-xs !px-3 !py-1.5">
              登录
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {mobileOpen && isAuthenticated && (
        <div className="md:hidden border-t border-white/[0.05] bg-[#050510]/95 backdrop-blur-xl animate-slide-down">
          <div className="px-4 py-2 space-y-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? "bg-purple-500/15 text-purple-300 font-medium"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-xs">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
