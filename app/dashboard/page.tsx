"use client";

import { useRouter } from "next/navigation";
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
  files: number;
  source: "GitHub" | "Upload";
  lastViewed: string;
}

const MOCK_REPOS: Repo[] = [
  { id: "1", name: "visualize-code", files: 127, source: "GitHub", lastViewed: "2 hours ago" },
  { id: "2", name: "nextjs-app", files: 342, source: "Upload", lastViewed: "Jan 15" },
  { id: "3", name: "api-gateway", files: 89, source: "GitHub", lastViewed: "Feb 10" },
  { id: "4", name: "framer-motion-utils", files: 45, source: "GitHub", lastViewed: "Yesterday" },
];

function RepoCard({ repo, onClick }: { repo: Repo; onClick: () => void }) {
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
          }}
          className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_REPOS.map((repo) => (
          <RepoCard key={repo.id} repo={repo} onClick={() => router.push(`/repo/${repo.id}`)} />
        ))}
      </div>

      {MOCK_REPOS.length === 0 && (
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
