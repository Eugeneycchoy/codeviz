"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Upload, GitBranch, Terminal, Check, X } from "lucide-react";

const ZIP_MAX_BYTES = 50 * 1024 * 1024;
const STEP_INTERVAL_MS = 2000;

const INGEST_STEPS = [
  { label: "Parsing files" },
  { label: "Analysing architecture" },
  { label: "Building graph" },
] as const;

type IngestState =
  | { status: "idle" }
  | { status: "loading"; mode: "zip" | "git"; fileName?: string }
  | {
      status: "error";
      mode: "zip" | "git";
      message: string;
      aiAnalysisFailed?: boolean;
      pendingFile?: File;
      pendingGitUrl?: string;
    }
  | {
      status: "duplicate";
      mode: "zip" | "git";
      repoName: string;
      pendingFile?: File;
      pendingGitUrl?: string;
    };

const Spinner = ({ className = "border-slate-400" }: { className?: string }) => (
  <div
    className={`border-t-2 rounded-full w-6 h-6 animate-spin ${className}`}
    aria-hidden
  />
);

export default function LandingPage() {
  const [dragActive, setDragActive] = useState(false);
  const [gitUrl, setGitUrl] = useState("");
  const [ingestState, setIngestState] = useState<IngestState>({ status: "idle" });
  const [loadingStep, setLoadingStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (ingestState.status !== "loading") return;
    const id = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, INGEST_STEPS.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ingestState.status]);

  useEffect(() => {
    if (ingestState.status !== "loading") setLoadingStep(0);
  }, [ingestState.status]);

  const submitZip = useCallback(
    async (file: File, force = false) => {
      if (status !== "authenticated") {
        router.push("/login");
        return;
      }
      if (file.size > ZIP_MAX_BYTES) {
        setIngestState({
          status: "error",
          mode: "zip",
          message:
            "File exceeds the 50 MB limit. Please try a smaller archive.",
        });
        return;
      }
      setIngestState({ status: "loading", mode: "zip", fileName: file.name });
      const formData = new FormData();
      formData.set("file", file);
      if (force) formData.set("force", "true");
      try {
        const res = await fetch("/api/repo/ingest", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.repoId === "string") {
          router.push(typeof data.slug === "string" ? "/repo/" + data.slug : "/repo/" + data.repoId);
          return;
        }
        if (res.status === 409 && typeof data.repoName === "string") {
          setIngestState({
            status: "duplicate",
            mode: "zip",
            repoName: data.repoName,
            pendingFile: file,
          });
          return;
        }
        const isAiFailed = data.error === "AI_ANALYSIS_FAILED";
        setIngestState({
          status: "error",
          mode: "zip",
          message:
            typeof data.error === "string" ? data.error : "Upload failed. Please try again.",
          ...(isAiFailed && {
            aiAnalysisFailed: true,
            pendingFile: file,
          }),
        });
      } catch {
        setIngestState({
          status: "error",
          mode: "zip",
          message: "Upload failed. Please try again.",
        });
      }
    },
    [router, status]
  );

  const submitGitUrl = useCallback(
    async (url: string, force = false) => {
      if (status !== "authenticated") {
        router.push("/login");
        return;
      }
      setIngestState({ status: "loading", mode: "git" });
      try {
        const res = await fetch("/api/repo/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gitUrl: url, force }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && typeof data.repoId === "string") {
          router.push(typeof data.slug === "string" ? "/repo/" + data.slug : "/repo/" + data.repoId);
          return;
        }
        if (res.status === 409 && typeof data.repoName === "string") {
          setIngestState({
            status: "duplicate",
            mode: "git",
            repoName: data.repoName,
            pendingGitUrl: url,
          });
          return;
        }
        const isAiFailed = data.error === "AI_ANALYSIS_FAILED";
        setIngestState({
          status: "error",
          mode: "git",
          message:
            typeof data.error === "string" ? data.error : "Clone failed. Please try again.",
          ...(isAiFailed && {
            aiAnalysisFailed: true,
            pendingGitUrl: url,
          }),
        });
      } catch {
        setIngestState({
          status: "error",
          mode: "git",
          message: "Clone failed. Please try again.",
        });
      }
    },
    [router, status]
  );

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
      if (ingestState.status === "loading" && ingestState.mode === "zip") return;
      if (e.dataTransfer.files?.[0]) {
        const file = e.dataTransfer.files[0];
        if (!file.name.toLowerCase().endsWith(".zip")) {
          setIngestState({
            status: "error",
            mode: "zip",
            message: "Please upload a .zip file.",
          });
          return;
        }
        submitZip(file);
      }
    },
    [ingestState, submitZip]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setIngestState({
          status: "error",
          mode: "zip",
          message: "Please upload a .zip file.",
        });
        return;
      }
      submitZip(file);
    },
    [submitZip]
  );

  const handleDropzoneClick = useCallback(() => {
    if (ingestState.status === "loading" && ingestState.mode === "zip") return;
    fileInputRef.current?.click();
  }, [ingestState]);

  const handleClone = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (status !== "authenticated") {
        router.push("/login");
        return;
      }
      const url = gitUrl.trim();
      if (!url) return;
      submitGitUrl(url);
    },
    [gitUrl, router, status, submitGitUrl]
  );

  const isZipLoading = ingestState.status === "loading" && ingestState.mode === "zip";
  const isGitLoading = ingestState.status === "loading" && ingestState.mode === "git";
  const zipError = ingestState.status === "error" && ingestState.mode === "zip" ? ingestState.message : null;
  const gitError = ingestState.status === "error" && ingestState.mode === "git" ? ingestState.message : null;
  const dropzoneInteractive = !isZipLoading;

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
          <div className="space-y-2">
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (dropzoneInteractive && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleDropzoneClick();
                }
              }}
              onDragEnter={dropzoneInteractive ? handleDrag : undefined}
              onDragOver={dropzoneInteractive ? handleDrag : undefined}
              onDragLeave={dropzoneInteractive ? handleDrag : undefined}
              onDrop={dropzoneInteractive ? handleDrop : undefined}
              onClick={handleDropzoneClick}
              className={
                dragActive && dropzoneInteractive
                  ? "group relative flex flex-col items-center justify-center p-12 md:p-20 border-2 border-dashed rounded-3xl transition-all duration-300 border-blue-500 bg-blue-50 scale-[1.02] shadow-2xl shadow-blue-100 cursor-pointer"
                  : dropzoneInteractive
                    ? "group relative flex flex-col items-center justify-center p-12 md:p-20 border-2 border-dashed rounded-3xl transition-all duration-300 border-slate-200 bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-100 cursor-pointer"
                    : "group relative flex flex-col items-center justify-center p-12 md:p-20 border-2 border-dashed rounded-3xl transition-all duration-300 border-slate-200 bg-slate-50 pointer-events-none"
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={onFileInputChange}
                aria-hidden
              />
              <div
                className={
                  isZipLoading
                    ? "p-5 rounded-2xl bg-slate-100"
                    : dragActive && dropzoneInteractive
                      ? "p-5 rounded-2xl transition-colors duration-300 bg-blue-100"
                      : "p-5 rounded-2xl transition-colors duration-300 bg-slate-50 group-hover:bg-slate-100"
                }
              >
                {isZipLoading ? (
                  <Spinner className="border-blue-600" />
                ) : (
                  <Upload
                    className={
                      dragActive && dropzoneInteractive
                        ? "h-8 w-8 transition-colors duration-300 text-blue-600"
                        : "h-8 w-8 transition-colors duration-300 text-slate-400 group-hover:text-slate-600"
                    }
                  />
                )}
              </div>
              <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-slate-800">
                  {isZipLoading
                    ? "Analyzing your repository…"
                    : dragActive && dropzoneInteractive
                      ? "Drop to analyze"
                      : "Drag or click to upload your repo ZIP"}
                </p>
                {isZipLoading && ingestState.status === "loading" && ingestState.fileName ? (
                  <p className="text-sm text-slate-500 font-medium mt-1">{ingestState.fileName}</p>
                ) : (
                  <p className="text-sm text-slate-400 font-medium mt-1">
                    Max 50 MB • .zip only
                  </p>
                )}
                {isZipLoading && ingestState.status === "loading" && (
                  <ul className="mt-4 space-y-2 text-left max-w-xs mx-auto" aria-live="polite">
                    {INGEST_STEPS.map((step, i) => (
                      <li
                        key={step.label}
                        className="flex items-center gap-2 text-sm font-medium"
                      >
                        {i < loadingStep ? (
                          <Check className="h-4 w-4 text-green-600 shrink-0" />
                        ) : i === loadingStep ? (
                          <Spinner className="h-4 w-4 shrink-0 border-blue-600" />
                        ) : (
                          <span className="w-4 h-4 shrink-0 rounded-full border-2 border-slate-200" />
                        )}
                        <span className={i <= loadingStep ? "text-slate-700" : "text-slate-400"}>
                          {step.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {ingestState.status === "error" && ingestState.mode === "zip" && ingestState.aiAnalysisFailed && (
              <div className="mt-3 p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
                <div className="flex items-center gap-2 text-red-700 font-medium">
                  <X className="h-4 w-4 shrink-0" />
                  <span>Analysing architecture failed</span>
                </div>
                <p className="text-sm text-red-600">
                  AI analysis could not complete. You can retry or try another repo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (ingestState.pendingFile) submitZip(ingestState.pendingFile);
                  }}
                  className="h-10 px-4 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
            {zipError && !(ingestState.status === "error" && ingestState.aiAnalysisFailed) && (
              <p className="text-sm text-red-600 font-medium text-center" role="alert">
                {zipError}
              </p>
            )}
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
                className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 bg-white text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                disabled={isGitLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!gitUrl.trim() || isGitLoading}
              className="h-14 px-8 rounded-2xl bg-blue-600 text-white font-semibold text-sm transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isGitLoading ? (
                <>
                  <Spinner className="border-white" />
                  Cloning…
                </>
              ) : (
                "Add repo"
              )}
            </button>
          </form>
          {isGitLoading && (
            <div className="space-y-2">
              <p className="text-sm text-slate-500 font-medium text-center">Cloning repository…</p>
              <ul className="space-y-2 text-left max-w-xs mx-auto" aria-live="polite">
                {INGEST_STEPS.map((step, i) => (
                  <li key={step.label} className="flex items-center gap-2 text-sm font-medium">
                    {i < loadingStep ? (
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                    ) : i === loadingStep ? (
                      <Spinner className="h-4 w-4 shrink-0 border-blue-600" />
                    ) : (
                      <span className="w-4 h-4 shrink-0 rounded-full border-2 border-slate-200" />
                    )}
                    <span className={i <= loadingStep ? "text-slate-700" : "text-slate-400"}>
                      {step.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ingestState.status === "error" && ingestState.mode === "git" && ingestState.aiAnalysisFailed && (
            <div className="mt-3 p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <X className="h-4 w-4 shrink-0" />
                <span>Analysing architecture failed</span>
              </div>
              <p className="text-sm text-red-600">
                AI analysis could not complete. You can retry or try another repo.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (ingestState.pendingGitUrl) submitGitUrl(ingestState.pendingGitUrl);
                }}
                className="h-10 px-4 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          {gitError && !(ingestState.status === "error" && ingestState.aiAnalysisFailed) && (
            <p className="text-sm text-red-600 font-medium text-center" role="alert">
              {gitError}
            </p>
          )}
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

      {ingestState.status === "duplicate" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-dialog-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 id="duplicate-dialog-title" className="text-xl font-bold text-slate-900">
              Replace existing repository?
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              A repository named <strong>{ingestState.repoName}</strong> already exists. Re-ingesting
              will permanently replace it and delete all cached AI explanations.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIngestState({ status: "idle" })}
                className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ingestState.mode === "zip" && ingestState.pendingFile) {
                    submitZip(ingestState.pendingFile, true);
                  } else if (ingestState.mode === "git" && ingestState.pendingGitUrl) {
                    submitGitUrl(ingestState.pendingGitUrl, true);
                  }
                }}
                className="h-11 px-5 rounded-2xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
