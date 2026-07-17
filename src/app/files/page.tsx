"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useRequireAuth } from "@/lib/auth-context";
import { getProjects, getProjectFiles, uploadFile, deleteFile, getFileDownloadUrl, type Project, type ProjectFile } from "@/lib/api";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeIcon(type: string): string {
  const map: Record<string, string> = { pdf: "📄", image: "🖼️", doc: "📝", text: "📃" };
  return map[type] || "📁";
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { pdf: "PDF", image: "图片", doc: "文档", text: "文本", other: "其他" };
  return map[type] || "其他";
}

export default function FilesPage() {
  const { isAuthenticated, loading: authLoading } = useRequireAuth();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const showMsg = (type: "success" | "error", text: string) => {
    setMsgType(type);
    setMessage(text);
    setTimeout(() => setMessage(""), 4000);
  };

  const loadProjects = useCallback(async () => {
    try {
      const res = await getProjects();
      if (res.data && res.data.length > 0) {
        setProjects(res.data);
        setSelectedProject((prev) => prev ?? res.data[0].id);
      } else {
        setProjects(res.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadFiles = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await getProjectFiles(selectedProject);
      setFiles(res.data || []);
    } catch {
      // ignore
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) loadProjects();
  }, [authLoading, isAuthenticated, loadProjects]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    setUploading(true);
    try {
      await uploadFile(selectedProject, file);
      showMsg("success", `"${file.name}" 上传成功`);
      loadFiles();
    } catch (err) {
      showMsg("error", "上传失败：" + (err instanceof Error ? err.message : "未知错误"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: number, name: string) => {
    if (!confirm(`确定删除 "${name}" 吗？`)) return;
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      showMsg("success", `"${name}" 已删除`);
    } catch (err) {
      showMsg("error", "删除失败：" + (err instanceof Error ? err.message : "未知错误"));
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="page-bg flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);

  return (
    <div className="page-bg">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="page-header animate-fade-in">
          <div>
            <h1 className="page-title">文件管理</h1>
            <p className="page-subtitle">上传、预览和管理项目文件</p>
          </div>
          <div className="flex gap-3">
            <select
              value={selectedProject || ""}
              onChange={(e) => setSelectedProject(Number(e.target.value))}
              className="glass-select text-sm"
            >
              {projects.length === 0 && <option value="" className="bg-slate-800">暂无项目</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
              ))}
            </select>
            <label className="btn-primary cursor-pointer text-sm whitespace-nowrap min-w-[110px]">
              {uploading ? "上传中..." : "+ 上传文件"}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Stats Mini */}
        <div className="glass-card p-4 mb-6 flex gap-6 animate-slide-up">
          <div className="text-center flex-1">
            <div className="text-white/25 text-[11px]">文件总数</div>
            <div className="text-white font-semibold text-lg">{files.length}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-white/25 text-[11px]">总大小</div>
            <div className="text-white font-semibold text-lg">{formatSize(totalSize)}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-white/25 text-[11px]">上传者</div>
            <div className="text-white font-semibold text-lg">{user?.username}</div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm animate-slide-down ${
            msgType === "error"
              ? "bg-red-500/5 border border-red-500/15 text-red-400"
              : "bg-emerald-500/5 border border-emerald-500/15 text-emerald-400"
          }`}>{message}</div>
        )}

        {/* File List */}
        {files.length === 0 ? (
          <div className="glass-card p-12 text-center animate-slide-up">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">暂无文件</div>
            <div className="empty-state-desc">选择项目后点击上方按钮上传第一个文件</div>
          </div>
        ) : (
          <div className="glass-card overflow-hidden animate-slide-up">
            {/* Desktop Table Header */}
            <div className="hidden md:grid grid-cols-[1fr_100px_100px_120px_60px] gap-4 px-6 py-3 border-b border-white/[0.04] text-white/25 text-xs font-medium">
              <span>文件名</span>
              <span>类型</span>
              <span>大小</span>
              <span>上传者</span>
              <span></span>
            </div>
            {files.map((file) => (
              <div key={file.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                {/* Desktop Row */}
                <div className="hidden md:grid grid-cols-[1fr_100px_100px_120px_60px] gap-4 px-6 py-3.5 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl flex-shrink-0">{typeIcon(file.file_type)}</span>
                    <button
                      onClick={() => window.open(getFileDownloadUrl(file.id), "_blank")}
                      className="text-white/80 text-sm hover:text-purple-400 truncate transition-colors text-left"
                      title={file.original_name}
                    >
                      {file.original_name}
                    </button>
                  </div>
                  <span className="text-white/25 text-xs">{typeLabel(file.file_type)}</span>
                  <span className="text-white/25 text-xs">{formatSize(file.file_size)}</span>
                  <span className="text-white/35 text-xs">{file.uploader_name}</span>
                  <button onClick={() => handleDelete(file.id, file.original_name)}
                    className="text-white/15 hover:text-red-400 text-xs transition-colors">删除</button>
                </div>
                {/* Mobile Row */}
                <div className="md:hidden px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{typeIcon(file.file_type)}</span>
                    <button
                      onClick={() => window.open(getFileDownloadUrl(file.id), "_blank")}
                      className="text-white/80 text-sm hover:text-purple-400 truncate transition-colors text-left flex-1"
                    >
                      {file.original_name}
                    </button>
                    <button onClick={() => handleDelete(file.id, file.original_name)}
                      className="text-white/15 hover:text-red-400 text-xs transition-colors">删除</button>
                  </div>
                  <div className="flex gap-3 text-[11px] text-white/25 pl-7">
                    <span>{typeLabel(file.file_type)}</span>
                    <span>{formatSize(file.file_size)}</span>
                    <span>{file.uploader_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
