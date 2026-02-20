"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  MarkerType,
} from "reactflow";
// Required for React Flow canvas, handles, and controls
import "reactflow/dist/style.css";
import {
  ChevronRight,
  Search,
  Info,
  FileCode,
  Box,
  X,
  Loader2,
} from "lucide-react";

type NodeData = { label: string; path: string };

function CustomFileNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div
      className={
        selected
          ? "px-5 py-3 rounded-2xl border-2 transition-all duration-300 shadow-xl shadow-slate-200/50 min-w-[180px] border-blue-500 bg-white scale-[1.05] ring-8 ring-blue-50"
          : "px-5 py-3 rounded-2xl border-2 transition-all duration-300 shadow-xl shadow-slate-200/50 min-w-[180px] border-slate-100 bg-white hover:border-blue-300 hover:shadow-2xl hover:shadow-slate-300/50"
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={
            selected
              ? "p-2 rounded-xl transition-colors duration-300 bg-blue-600 text-white"
              : "p-2 rounded-xl transition-colors duration-300 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
          }
        >
          <FileCode className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p
            className={
              selected
                ? "text-sm font-bold truncate leading-tight transition-colors duration-300 text-blue-700"
                : "text-sm font-bold truncate leading-tight transition-colors duration-300 text-slate-800"
            }
          >
            {data.label}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
            {data.path.split("/").slice(0, -1).join("/") || "root"}
          </p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  file: CustomFileNode,
};

export default function RepoGraphPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) ?? "";
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [repoName, setRepoName] = useState<string>("");
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
          throw new Error(res.status === 401 ? "Unauthorized" : "Failed to load graph");
        }
        return res.json();
      })
      .then((data) => {
        if (data == null) return;
        setNodes(data.nodes ?? []);
        setEdges(
          (data.edges ?? []).map((e: Edge) => ({
            ...e,
            markerEnd: e.markerEnd ?? { type: MarkerType.ArrowClosed, color: "#3b82f6" },
            style: e.style ?? { stroke: "#3b82f6", strokeWidth: 2 },
          }))
        );
        setRepoName(data.repoName ?? slug);
      })
      .catch((err) => {
        setGraphError(err instanceof Error ? err.message : "Failed to load graph");
      })
      .finally(() => {
        setGraphLoading(false);
      });
  }, [slug, router, setNodes, setEdges]);

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

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
  }, []);

  const closePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const dependencyNodes = useMemo(() => {
    if (!selectedNode) return [];
    return edges
      .filter((e) => e.source === selectedNode.id)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is Node<NodeData> => n != null);
  }, [selectedNode, edges, nodes]);

  const displayName = repoName || slug || "visualize-code";

  if (graphLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-slate-600">Loading dependency graph...</p>
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
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-white">
      <div className="absolute top-0 left-0 right-0 z-10 px-8 py-4 bg-white/50 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50">
            <Box className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-sm font-bold text-blue-700">{displayName}</span>
          </div>
          <span className="text-slate-200">/</span>
          <span className="text-sm font-semibold text-slate-500">Dependency Graph</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="h-9 pl-9 pr-4 rounded-xl border border-slate-100 bg-white/80 text-xs font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all w-64"
            />
          </div>
          <button
            type="button"
            className="p-2 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors text-slate-500"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-50/30"
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#e2e8f0" />
        <Controls
          className="bg-white border-slate-100 shadow-xl rounded-2xl overflow-hidden [&_button]:h-10 [&_button]:w-10 [&_button]:border-slate-100 [&_button]:hover:bg-slate-50 [&_button]:transition-colors"
          showInteractive={false}
        />
        <Panel position="bottom-center" className="mb-6">
          <div className="px-5 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-md text-white/90 text-[11px] font-bold tracking-widest uppercase flex items-center gap-4 shadow-2xl">
            <span>Scroll to zoom</span>
            <div className="w-px h-3 bg-white/20" />
            <span>Drag to pan</span>
            <div className="w-px h-3 bg-white/20" />
            <span>Click node to explain</span>
          </div>
        </Panel>
      </ReactFlow>

      {selectedNode && (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={closePanel}
            onKeyDown={(e) => e.key === "Escape" && closePanel()}
            className="absolute inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px] md:hidden"
            aria-label="Close panel"
          />
          <div
            className="absolute top-0 right-0 z-50 h-full w-full max-w-sm md:max-w-md bg-white shadow-2xl border-l border-slate-100 flex flex-col"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600">
                  <FileCode className="h-5 w-5" />
                  <span className="text-sm font-bold tracking-widest uppercase">File details</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 truncate">
                  {selectedNode.data?.label as string}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-8 space-y-10">
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Path</h3>
                <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm text-slate-600">
                  {selectedNode.data?.path as string}
                </div>
              </section>

              <section className="min-w-0 w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    AI Explanation
                  </h3>
                  {!explanationLoading && explanation != null && explanation !== "No explanation available." && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      <div className="h-1 w-1 rounded-full bg-blue-600" />
                      Cached
                    </div>
                  )}
                  {!explanationLoading && explanation !== null && explanation === "No explanation available." && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Not generated
                    </span>
                  )}
                </div>
                <div className="prose prose-slate min-w-0 w-full max-w-full">
                  {explanationLoading ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm font-medium">Loading explanation...</span>
                    </div>
                  ) : (
                    <p className="w-full max-w-full min-w-0 text-lg text-slate-600 leading-relaxed font-medium break-words">
                      {explanation ?? "No explanation available."}
                    </p>
                  )}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Dependencies
                </h3>
                <div className="space-y-2">
                  {dependencyNodes.length === 0 ? (
                    <p className="text-sm text-slate-500">No direct dependencies.</p>
                  ) : (
                    dependencyNodes.map((dep) => (
                      <button
                        key={dep.id}
                        type="button"
                        onClick={() => setSelectedNode(dep)}
                        className="flex w-full items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-white text-slate-400 transition-colors shrink-0">
                            <FileCode className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-700 truncate">
                            {dep.data?.label ?? dep.id}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-200 active:scale-95"
              >
                <FileCode className="h-5 w-5" />
                <span>Open in Editor</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
