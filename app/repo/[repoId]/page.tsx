"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

const initialNodes: Node<NodeData>[] = [
  { id: "1", type: "file", position: { x: 250, y: 0 }, data: { label: "App.tsx", path: "src/App.tsx" } },
  {
    id: "2",
    type: "file",
    position: { x: 100, y: 150 },
    data: { label: "Navbar.tsx", path: "src/components/Navbar.tsx" },
  },
  {
    id: "3",
    type: "file",
    position: { x: 400, y: 150 },
    data: { label: "Dashboard.tsx", path: "src/pages/Dashboard.tsx" },
  },
  {
    id: "4",
    type: "file",
    position: { x: 50, y: 300 },
    data: { label: "UserAvatar.tsx", path: "src/components/UserAvatar.tsx" },
  },
  {
    id: "5",
    type: "file",
    position: { x: 250, y: 300 },
    data: { label: "RepoCard.tsx", path: "src/components/RepoCard.tsx" },
  },
  {
    id: "6",
    type: "file",
    position: { x: 500, y: 300 },
    data: { label: "api.ts", path: "src/lib/api.ts" },
  },
];

const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
    style: { stroke: "#3b82f6", strokeWidth: 2 },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#3b82f6" },
    style: { stroke: "#3b82f6", strokeWidth: 2 },
  },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
    style: { stroke: "#cbd5e1", strokeWidth: 2 },
  },
  {
    id: "e3-6",
    source: "3",
    target: "6",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
    style: { stroke: "#cbd5e1", strokeWidth: 2 },
  },
  {
    id: "e2-4",
    source: "2",
    target: "4",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
    style: { stroke: "#cbd5e1", strokeWidth: 2 },
  },
];

const MOCK_EXPLANATIONS: Record<string, string> = {
  "App.tsx":
    "This is the entry point of your React application. It sets up the main layout, theme providers, and the primary router to handle navigation between the landing page, dashboard, and repository views.",
  "Navbar.tsx":
    "A persistent navigation component displayed at the top of every page. It includes the CodeViz logo, primary navigation links for authenticated users, and the authentication actions (Sign in/Get started).",
  "Dashboard.tsx":
    "The central hub for signed-in users. It fetches and displays all repositories associated with the user's account in a responsive grid layout. It also provides the empty state and 'Add Repository' triggers.",
  "UserAvatar.tsx":
    "A reusable component that displays the user's profile picture or initials. It's used in the navbar and other areas where user identity needs to be shown.",
  "RepoCard.tsx":
    "A card component for the dashboard that summarizes repository metadata like file count, last viewed date, and source type (GitHub or manual upload).",
  "api.ts":
    "A utility module that centralizes all external data requests. It handles authentication headers, error catching, and data transformation for the rest of the application's components.",
};

export default function RepoGraphPage() {
  const params = useParams();
  const repoId = (params?.repoId as string) ?? "";
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);

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

  const activeExplanation = useMemo(() => {
    if (!selectedNode) return null;
    const label = selectedNode.data?.label as string;
    return MOCK_EXPLANATIONS[label] ?? "No explanation available for this file.";
  }, [selectedNode]);

  const displayName = repoId || "visualize-code";

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

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Path</h3>
                <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm text-slate-600">
                  {selectedNode.data?.path as string}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    AI Explanation
                  </h3>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    <div className="h-1 w-1 rounded-full bg-blue-600 animate-pulse" />
                    Cached
                  </div>
                </div>
                <div className="prose prose-slate max-w-none">
                  <p className="text-lg text-slate-600 leading-relaxed font-medium">
                    {activeExplanation}
                  </p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Dependencies
                </h3>
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-white text-slate-400 transition-colors">
                          <FileCode className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">dependency_{i}.tsx</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                  ))}
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
