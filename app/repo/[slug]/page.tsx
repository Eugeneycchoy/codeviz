"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Node, Edge } from "reactflow";
import type { NodeData } from "@/components/FileNode";
import DependencyGraph, { type GraphNodeData, type LayerInfo } from "@/components/DependencyGraph";
import { GraphHeader, type EdgeFilter } from "@/components/GraphHeader";
import { GraphLegend } from "@/components/GraphLegend";
import { SidePanel } from "@/components/SidePanel";
import { Loader2 } from "lucide-react";

const SEARCH_RESULTS_MAX = 10;

export default function RepoGraphPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) ?? "";

  const [nodes, setNodes] = useState<Node<GraphNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchTarget, setSearchTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [repoName, setRepoName] = useState("");
  const [stackName, setStackName] = useState<string | undefined>(undefined);
  const [orphanCount, setOrphanCount] = useState(0);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all");

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const focusedNodeId = selectedNode?.id ?? null;

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
        setNodes(data.nodes ?? []);
        setEdges(data.edges ?? []);
        setLayers(data.layers ?? []);
        setRepoName(data.repoName ?? slug);
        setStackName(data.stackName ?? undefined);
        setOrphanCount(data.orphanCount ?? 0);
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

  useEffect(() => {
    if (!selectedNode) {
      setExplanation(null);
      return;
    }
    setExplanationLoading(true);
    setExplanation(null);
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileId: selectedNode.id }),
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
  }, [selectedNode]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        searchContainerRef.current &&
        target &&
        !searchContainerRef.current.contains(target)
      ) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.activeElement instanceof HTMLInputElement) return;
      setSelectedNode(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fileNodes = useMemo(
    () => nodes.filter((n): n is Node<NodeData> => n.type === "file"),
    [nodes]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return fileNodes
      .filter((n) => (n.data?.label ?? "").toLowerCase().includes(q))
      .slice(0, SEARCH_RESULTS_MAX);
  }, [fileNodes, searchQuery]);

  const closePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleSearchSelect = useCallback((nodeId: string) => {
    setSearchQuery("");
    setSearchTarget(nodeId);
    setTimeout(() => setSearchTarget(null), 1000);
  }, []);

  const handleNodeNavigate = useCallback((nodeId: string) => {
    const target = fileNodes.find((n) => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
      setSearchTarget(nodeId);
      setTimeout(() => setSearchTarget(null), 1000);
    }
  }, [fileNodes]);

  const displayName = repoName || slug || "visualize-code";

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
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-white flex flex-col">
      <GraphHeader
        repoName={displayName}
        stackName={stackName}
        edgeFilter={edgeFilter}
        onEdgeFilterChange={setEdgeFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchResults={searchResults}
        onSearchSelect={handleSearchSelect}
        searchContainerRef={searchContainerRef}
      />

      <div className="flex-1 relative" style={{ marginTop: 45 }}>
        <DependencyGraph
          initialNodes={nodes}
          initialEdges={edges}
          searchTarget={searchTarget}
          focusedNodeId={focusedNodeId}
          hoveredNodeId={hoveredNodeId}
          onNodeSelect={setSelectedNode}
          onNodeHover={setHoveredNodeId}
          orphanCount={orphanCount}
          edgeFilter={edgeFilter}
          layers={layers}
        />

        {/* Side panel */}
        {selectedNode && (
          <div
            className="absolute top-0 right-0 z-50 h-full bg-white shadow-2xl border-l border-slate-200"
            style={{
              width: 320,
              transition: "width 0.25s ease",
            }}
          >
            <SidePanel
              node={selectedNode}
              edges={edges}
              allNodes={fileNodes}
              explanation={explanation}
              explanationLoading={explanationLoading}
              onClose={closePanel}
              onNodeNavigate={handleNodeNavigate}
              onNodeHover={setHoveredNodeId}
            />
          </div>
        )}
      </div>

      <GraphLegend />
    </div>
  );
}
