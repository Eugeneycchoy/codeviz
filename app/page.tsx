"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, GitBranch, Terminal } from "lucide-react";

export default function LandingPage() {
  const [dragActive, setDragActive] = useState(false);
  const [gitUrl, setGitUrl] = useState("");
  const router = useRouter();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        router.push("/repo/upload-123");
      }
    },
    [router]
  );

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (gitUrl) {
      router.push("/repo/clone-456");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 py-20">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 drop-shadow-sm">
            Drop a repo, <span className="text-blue-600">understand it</span> instantly.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
            Interactive dependency graphs with AI-powered file explanations for faster code navigation.
          </p>
        </div>

        <div className="space-y-12 py-10">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={
              dragActive
                ? "group relative flex flex-col items-center justify-center p-12 md:p-20 border-2 border-dashed rounded-3xl transition-all duration-300 border-blue-500 bg-blue-50 scale-[1.02] shadow-2xl shadow-blue-100"
                : "group relative flex flex-col items-center justify-center p-12 md:p-20 border-2 border-dashed rounded-3xl transition-all duration-300 border-slate-200 bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100"
            }
          >
            <div
              className={
                dragActive
                  ? "p-5 rounded-2xl transition-colors duration-300 bg-blue-100"
                  : "p-5 rounded-2xl transition-colors duration-300 bg-slate-50 group-hover:bg-slate-100"
              }
            >
              <Upload
                className={
                  dragActive
                    ? "h-8 w-8 transition-colors duration-300 text-blue-600"
                    : "h-8 w-8 transition-colors duration-300 text-slate-400 group-hover:text-slate-600"
                }
              />
            </div>
            <div className="mt-6 text-center">
              <p className="text-lg font-semibold text-slate-800">
                {dragActive ? "Drop to analyze" : "Drag your repo ZIP here"}
              </p>
              <p className="text-sm text-slate-400 font-medium mt-1">
                Max 50 MB • Support .zip, .tar.gz
              </p>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative px-6 bg-[#fafafa]">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-400">or</span>
            </div>
          </div>

          <form onSubmit={handleClone} className="max-w-xl mx-auto flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-blue-500 text-slate-400">
                <GitBranch className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="https://github.com/owner/repo.git"
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 bg-white text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={!gitUrl}
              className="h-14 px-8 rounded-2xl bg-blue-600 text-white font-semibold text-sm transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              Add repo
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-12 pt-10 text-slate-400 grayscale opacity-70 transition-all hover:grayscale-0 hover:opacity-100">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <span className="text-sm font-bold tracking-tight">TypeScript</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <span className="text-sm font-bold tracking-tight">React</span>
          </div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <span className="text-sm font-bold tracking-tight">Node.js</span>
          </div>
        </div>
      </div>
    </div>
  );
}
