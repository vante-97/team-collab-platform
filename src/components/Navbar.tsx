"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { getUnreadCount } from "@/lib/api";

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
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => setMounted(true), []);

  const fetchUnread = useCallback(() => {
    if (!isAuthenticated) return;
    getUnreadCount().then((res) => {
      if (res.code === 200 && res.data) {
        setUnreadCount(res.data.count);
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    const handler = () => fetchUnread();
    window.addEventListener("inbox-refresh", handler);
    return () => window.removeEventListener("inbox-refresh", handler);
  }, [fetchUnread]);

  const isActive = (href: string) => {
    if (href === "/projects" && pathname.startsWith("/projects")) return true;
    if (href === "/" && pathname === "/") return true;
    return pathname === href;
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <nav className="sticky top-0 z-50 bg-[var(--bg-deep)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4 md:gap-8">
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
              T
            </div>
            <span className="text-[var(--text-primary)] font-semibold text-base tracking-tight hidden sm:inline">
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
                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 font-medium"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
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

        {/* Right: Theme Toggle + User + Inbox + Logout */}
        <div className="hidden md:flex items-center gap-2">
          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all duration-200"
              title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          )}

          {isAuthenticated ? (
            <>
              {/* Inbox */}
              <Link
                href="/inbox"
                className={`relative p-2 rounded-lg transition-all duration-200 ${
                  pathname === "/inbox"
                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-300"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
                }`}
                title="收件箱"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 12h-6l-2 3H10l-2-3H2" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-purple-500 text-white text-[10px] font-bold min-w-[16px] min-h-[16px]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-[var(--text-secondary)] text-sm">{user?.username}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-red-500 dark:hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all duration-200"
              >
                退出
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-card)] transition-all duration-200">
                登录
              </Link>
              <Link href="/register" className="btn-primary text-sm !px-4 !py-1.5">
                注册
              </Link>
            </div>
          )}
        </div>

        {/* Mobile: Theme + Hamburger + User */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
          )}
          {isAuthenticated && (
            <Link
              href="/inbox"
              className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-6l-2 3H10l-2-3H2" />
                <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-purple-500 text-white text-[10px] font-bold min-w-[16px] min-h-[16px]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {isAuthenticated && (
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
            >
              <span className={`w-4 h-0.5 bg-[var(--text-secondary)] rounded-full transition-all ${mobileOpen ? "rotate-45 translate-y-1" : ""}`} />
              <span className={`w-4 h-0.5 bg-[var(--text-secondary)] rounded-full transition-all ${mobileOpen ? "-rotate-45 -translate-y-1" : ""}`} />
            </button>
          )}
          {isAuthenticated && (
            <button onClick={logout} className="text-[var(--text-muted)] text-xs px-2 py-1 hover:text-red-500 transition-colors">
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
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/95 backdrop-blur-xl animate-slide-down">
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
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 font-medium"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
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
