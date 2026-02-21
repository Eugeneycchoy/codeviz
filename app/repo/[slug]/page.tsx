"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import ArchGraph from "@/components/ArchGraph";
import type { GraphModule, GraphEdge } from "@/components/ArchGraph";
import { ArchDetailPanel } from "@/components/ArchDetailPanel";
import type { FixedLayer } from "@/lib/layers";

export default function RepoGraphPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) ?? "";

  const [repoName, setRepoName] = useState("");
  const [stackName, setStackName] = useState<string | undefined>(undefined);
  const [layers, setLayers] = useState<FixedLayer[]>([]);
  const [modules, setModules] = useState<GraphModule[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setGraphLoading(true);
    setGraphError(null);
    fetch(`/api/repo/${slug}/graph`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) {
            router.push("/dashboard");
            return null;
          }
          throw new Error(
            res.status === 401 ? "Unauthorized" : "Failed to load graph"
          );
        }
        return res.json();
      })
      .then((data) => {
        if (data == null) return;
        setRepoName(data.repoName ?? slug);
        setStackName(data.stackName ?? undefined);
        setLayers(data.layers ?? []);
        setModules(data.modules ?? []);
        setEdges(data.edges ?? []);
      })
      .catch((err) => {
        setGraphError(
          err instanceof Error ? err.message : "Failed to load graph"
        );
      })
      .finally(() => {
        setGraphLoading(false);
      });
  }, [slug, router]);

  // Fetch AI explanation when a file is selected
  useEffect(() => {
    if (!selectedFileId) {
      setExplanation(null);
      return;
    }
    setExplanationLoading(true);
    setExplanation(null);
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileId: selectedFileId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setExplanation(data?.explanation ?? "No explanation available.");
      })
      .catch(() => {
        setExplanation("No explanation available.");
      })
      .finally(() => {
        setExplanationLoading(false);
      });
  }, [selectedFileId]);

  // Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.activeElement instanceof HTMLInputElement) return;
      setSelectedFileId(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (graphLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-600">
            Loading dependency graph...
          </p>
        </div>
      </div>
    );
  }
  if (graphError) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-medium text-slate-600">{graphError}</p>
          <Link
            href="/dashboard"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-auto bg-white">
      <ArchGraph
        repoName={repoName}
        stackName={stackName}
        layers={layers}
        modules={modules}
        edges={edges}
        selectedFileId={selectedFileId}
        onFileSelect={setSelectedFileId}
      />

      <AnimatePresence>
        {selectedFileId && (
          <ArchDetailPanel
            fileId={selectedFileId}
            layers={layers}
            modules={modules}
            edges={edges}
            explanation={explanation}
            explanationLoading={explanationLoading}
            onClose={() => setSelectedFileId(null)}
            onFileSelect={setSelectedFileId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
