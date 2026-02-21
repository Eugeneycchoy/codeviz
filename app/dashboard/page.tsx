"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import {
  FolderGit2,
  Github,
  Upload,
  Calendar,
  Files,
  Trash2,
  ArrowRight,
  Plus,
} from "lucide-react";

interface Repo {
  id: string;
  name: string;
  slug: string;
  files: number;
  source: "GitHub" | "Upload";
  lastViewed: string;
}

type ApiRepo = {
  id: string;
  name: string;
  slug: string;
  file_count: number;
  source_type: string;
  last_viewed_at: string | null;
  created_at: string;
};

function formatLastViewed(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function RepoCard({
  repo,
  onClick,
  onDelete,
  isDeleting,
  deleteError,
}: {
  repo: Repo;
  onClick: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  deleteError?: string | null;
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative flex flex-col bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm transition-all duration-300 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50 cursor-pointer overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          disabled={isDeleting}
          className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isDeleting ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
      {deleteError && (
        <p className="absolute top-14 right-4 left-4 text-xs font-medium text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {deleteError}
        </p>
      )}

      <div className="flex items-center gap-4 mb-8">
        <div
          className={
            repo.source === "GitHub"
              ? "p-4 rounded-2xl flex items-center justify-center transition-colors duration-300 bg-slate-900 group-hover:bg-blue-600"
              : "p-4 rounded-2xl flex items-center justify-center transition-colors duration-300 bg-blue-100 group-hover:bg-blue-600"
          }
        >
          {repo.source === "GitHub" ? (
            <Github className="h-6 w-6 text-white" />
          ) : (
            <Upload className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-bold text-slate-800 truncate leading-tight group-hover:text-blue-700 transition-colors duration-300">
            {repo.name}
          </h3>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-blue-400 transition-colors duration-300">
            {repo.source}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-auto">
        <div className="flex items-center gap-2.5 text-slate-500">
          <Files className="h-4 w-4" />
          <span className="text-sm font-semibold">{repo.files} files</span>
        </div>
        <div className="flex items-center gap-2.5 text-slate-500">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-semibold whitespace-nowrap">{repo.lastViewed}</span>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
        <span className="text-sm font-bold text-blue-600">Open repository</span>
        <ArrowRight className="h-4 w-4 text-blue-600 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingSlugs, setDeletingSlugs] = useState<Record<string, boolean>>({});
  const [deleteErrorBySlug, setDeleteErrorBySlug] = useState<Record<string, string>>({});

  const handleDelete = useCallback(async (repo: Repo) => {
    const { slug } = repo;
    setDeletingSlugs((prev) => ({ ...prev, [slug]: true }));
    setDeleteErrorBySlug((prev) => ({ ...prev, [slug]: "" }));
    try {
      const res = await fetch(`/api/repo/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data?.error === "string" ? data.error : "Failed to delete repository";
        setDeleteErrorBySlug((prev) => ({ ...prev, [slug]: msg }));
        return;
      }
      setRepos((prev) => prev.filter((r) => r.slug !== slug));
    } catch {
      setDeleteErrorBySlug((prev) => ({ ...prev, [slug]: "Failed to delete repository" }));
    } finally {
      setDeletingSlugs((prev) => ({ ...prev, [slug]: false }));
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/repo");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : "Failed to load repositories");
        setRepos([]);
        return;
      }
      const data: ApiRepo[] = await res.json();
      setRepos(
        data.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          files: r.file_count,
          source: r.source_type === "git_url" ? "GitHub" : "Upload",
          lastViewed: formatLastViewed(r.last_viewed_at),
        }))
      );
    } catch {
      setError("Failed to load repositories");
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") fetchRepos();
  }, [status, router, fetchRepos]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Your repositories
          </h1>
          <p className="text-slate-500 font-medium">
            Manage and explore your added or cloned projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-blue-600 text-white font-bold transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-100 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span>New Repository</span>
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-[32px] border border-slate-100 bg-slate-50 animate-pulse"
              aria-hidden
            />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            type="button"
            onClick={fetchRepos}
            className="mt-3 text-sm font-semibold text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && repos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              onClick={() => router.push(`/repo/${repo.slug}`)}
              onDelete={() => handleDelete(repo)}
              isDeleting={deletingSlugs[repo.slug]}
              deleteError={deleteErrorBySlug[repo.slug] || null}
            />
          ))}
        </div>
      )}

      {!loading && !error && repos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-[40px] bg-white space-y-6">
          <div className="p-6 rounded-3xl bg-slate-50">
            <FolderGit2 className="h-12 w-12 text-slate-300" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-800">No repositories yet</h3>
            <p className="text-slate-500 max-w-sm font-medium">
              Start by adding your first repository from the home page or clone directly from
              GitHub.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 h-12 px-8 rounded-2xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95"
          >
            Go to landing page
          </button>
        </div>
      )}
    </div>
  );
}
