"use client";

import { useState, useEffect, useCallback } from "react";
import { useRequireAuth, useAuth } from "@/lib/auth-context";
import { getInvitations, respondInvitation, getUnreadCount, Invitation } from "@/lib/api";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  member: "成员",
  viewer: "观察者",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  rejected: "text-red-400 bg-red-500/10 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  accepted: "已接受",
  rejected: "已拒绝",
};

export default function InboxPage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { user } = useAuth();

  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState<number | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInvitations();
      if (res.code === 200 && res.data) {
        setReceived(res.data.received || []);
        setSent(res.data.sent || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchInvitations();
  }, [isAuthenticated, fetchInvitations]);

  // 刷新未读数
  useEffect(() => {
    if (!isAuthenticated) return;
    // 通知 Navbar 刷新
    window.dispatchEvent(new Event("inbox-refresh"));
  }, [isAuthenticated]);

  const handleRespond = async (invId: number, action: "accept" | "reject") => {
    setResponding(invId);
    try {
      const res = await respondInvitation(invId, action);
      if (res.code === 200) {
        setReceived((prev) =>
          prev.map((i) =>
            i.id === invId
              ? { ...i, status: action === "accept" ? "accepted" : "rejected" }
              : i
          )
        );
        window.dispatchEvent(new Event("inbox-refresh"));
      } else {
        alert(res.message || "操作失败");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失败");
    } finally {
      setResponding(null);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const pendingCount = received.filter((i) => i.status === "pending").length;

  return (
    <div className="page-bg">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="page-header animate-fade-in">
          <div>
            <h1 className="page-title">收件箱</h1>
            <p className="page-subtitle">
              {pendingCount > 0
                ? `${pendingCount} 条待处理的邀请`
                : "暂无待处理邀请"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06] animate-fade-in">
          <button
            onClick={() => setTab("received")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === "received"
                ? "bg-purple-500/20 text-purple-300"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            收到的邀请
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === "sent"
                ? "bg-purple-500/20 text-purple-300"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            发出的邀请
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="spinner" />
            <span className="ml-3 text-white/25 text-sm">加载中...</span>
          </div>
        )}

        {/* Received */}
        {!loading && tab === "received" && (
          <>
            {received.length === 0 ? (
              <div className="empty-state animate-fade-in">
                <div className="empty-state-icon">📬</div>
                <div className="empty-state-title">暂无收到的邀请</div>
                <div className="empty-state-desc">当有人邀请你加入项目时，会在这里显示</div>
              </div>
            ) : (
              <div className="space-y-3 animate-slide-up">
                {received.map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400/20 to-violet-400/20 flex items-center justify-center text-purple-300 font-bold shrink-0">
                        {inv.inviter_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/80 text-sm">
                          <span className="text-purple-400 font-medium">{inv.inviter_name}</span>
                          <span className="text-white/40"> 邀请你加入 </span>
                          <Link
                            href={`/projects/${inv.project_id}`}
                            className="text-purple-300 hover:text-purple-200 underline underline-offset-2"
                          >
                            {inv.project_name}
                          </Link>
                        </p>
                        <p className="text-white/25 text-xs mt-1">
                          角色：{ROLE_LABELS[inv.role] || inv.role} ·{" "}
                          {new Date(inv.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-14 md:ml-0 flex-shrink-0">
                      {inv.status === "pending" ? (
                        <>
                          <button
                            onClick={() => handleRespond(inv.id, "accept")}
                            disabled={responding === inv.id}
                            className="px-4 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-sm rounded-lg font-medium transition-all border border-emerald-500/20 disabled:opacity-50"
                          >
                            {responding === inv.id ? "..." : "接受"}
                          </button>
                          <button
                            onClick={() => handleRespond(inv.id, "reject")}
                            disabled={responding === inv.id}
                            className="px-4 py-1.5 bg-white/[0.04] hover:bg-red-500/10 text-white/40 hover:text-red-400 text-sm rounded-lg transition-all border border-white/[0.06] disabled:opacity-50"
                          >
                            拒绝
                          </button>
                        </>
                      ) : (
                        <span className={`status-badge ${STATUS_COLORS[inv.status]}`}>
                          {STATUS_LABELS[inv.status]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Sent */}
        {!loading && tab === "sent" && (
          <>
            {sent.length === 0 ? (
              <div className="empty-state animate-fade-in">
                <div className="empty-state-icon">📤</div>
                <div className="empty-state-title">暂无发出的邀请</div>
                <div className="empty-state-desc">你还没有向任何人发送过项目邀请</div>
              </div>
            ) : (
              <div className="space-y-3 animate-slide-up">
                {sent.map((inv) => (
                  <div
                    key={inv.id}
                    className="glass-card p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400/20 to-cyan-400/20 flex items-center justify-center text-blue-300 font-bold shrink-0">
                        {inv.invitee_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white/80 text-sm">
                          <span className="text-white/40">邀请 </span>
                          <span className="text-blue-400 font-medium">{inv.invitee_name}</span>
                          <span className="text-white/40"> 加入 </span>
                          <Link
                            href={`/projects/${inv.project_id}`}
                            className="text-purple-300 hover:text-purple-200 underline underline-offset-2"
                          >
                            {inv.project_name}
                          </Link>
                        </p>
                        <p className="text-white/25 text-xs mt-1">
                          角色：{ROLE_LABELS[inv.role] || inv.role} ·{" "}
                          {new Date(inv.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-14 md:ml-0 flex-shrink-0">
                      <span className={`status-badge ${STATUS_COLORS[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
