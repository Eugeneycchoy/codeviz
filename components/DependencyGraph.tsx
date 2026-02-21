"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { type NodeData, FileNode } from "@/components/FileNode";

export type GraphNodeData = NodeData | LayerLabelData;

const OrphanToggleContext = createContext<{
  collapsed: boolean;
  count: number;
  onToggle: () => void;
}>({ collapsed: true, count: 0, onToggle: () => {} });

export interface DependencyGraphProps {
  initialNodes: Node<GraphNodeData>[];
  initialEdges: Edge[];
  searchTarget: string | null;
  focusedNodeId: string | null;
  onNodeSelect: (node: Node<NodeData> | null) => void;
  orphanCount: number;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

const LEGEND_ITEMS = [
  { ext: ".tsx", bg: "bg-blue-500" },
  { ext: ".ts", bg: "bg-violet-500" },
  { ext: ".jsx", bg: "bg-cyan-500" },
  { ext: ".js", bg: "bg-amber-500" },
  { ext: ".py", bg: "bg-emerald-500" },
  { ext: ".json", bg: "bg-orange-500" },
  { ext: ".md", bg: "bg-slate-400" },
  { ext: ".css/.scss", bg: "bg-pink-500" },
];

const ROLE_LEGEND_ITEMS = [
  { label: "Entry", bg: "bg-emerald-400", hint: "start here" },
  { label: "Hub", bg: "bg-amber-400", hint: "widely used" },
  { label: "Shared", bg: "bg-blue-400", hint: "used in 2+ places" },
  { label: "Leaf", bg: "bg-slate-300", hint: "no dependencies" },
];

type SectionDividerData = { orphanCount?: number };

function SectionDividerNode(_props: NodeProps<SectionDividerData>) {
  const { collapsed, count, onToggle } = useContext(OrphanToggleContext);
  return (
    <div className="min-w-[600px]">
      <div className="h-px bg-slate-200" />
      <button
        type="button"
        onClick={onToggle}
        className="mt-1 flex items-center gap-1.5 cursor-pointer text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
      >
        <span aria-hidden>{collapsed ? "▶" : "▼"}</span>
        <span>ISOLATED FILES ({count})</span>
      </button>
    </div>
  );
}

export type LayerLabelData = { label: string };

function LayerLabelNode({ data }: NodeProps<LayerLabelData>) {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pointer-events-none select-none"
      style={{ transform: "rotate(-90deg)", transformOrigin: "left center" }}
    >
      {data?.label ?? ""}
    </div>
  );
}

const NODE_TYPES = {
  file: FileNode,
  sectionDivider: SectionDividerNode,
  layerLabel: LayerLabelNode,
};

interface GraphControllerProps {
  searchTarget: string | null;
  nodes: Node<GraphNodeData>[];
  setNodes: Dispatch<SetStateAction<Node<GraphNodeData>[]>>;
}

function GraphController({ searchTarget, nodes, setNodes }: GraphControllerProps) {
  const { setCenter } = useReactFlow();
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  useEffect(() => {
    if (searchTarget == null) return;
    const currentNodes = nodesRef.current;
    const node = currentNodes.find((n) => n.id === searchTarget);
    if (node == null) return;
    const data = node.data as NodeData & { highlighted?: boolean };
    if (data.highlighted === true) return;

    const x = typeof node.position?.x === "number" ? node.position.x : 0;
    const y = typeof node.position?.y === "number" ? node.position.y : 0;
    setCenter(x + NODE_WIDTH / 2, y + NODE_HEIGHT / 2, {
      zoom: 1.5,
      duration: 800,
    });

    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== searchTarget) return n;
        const data = n.data as NodeData & { highlighted?: boolean };
        return { ...n, data: { ...data, highlighted: true as const } };
      })
    );

    const timeout = setTimeout(() => {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== searchTarget) return n;
          const data = n.data as NodeData & { highlighted?: boolean };
          return { ...n, data: { ...data, highlighted: false } };
        })
      );
    }, 1200);

    return () => clearTimeout(timeout);
  }, [searchTarget, setCenter, setNodes]);
  return null;
}

interface DependencyGraphInnerProps extends DependencyGraphProps {}

function DependencyGraphInner({
  initialNodes,
  initialEdges,
  searchTarget,
  focusedNodeId,
  onNodeSelect,
  orphanCount,
}: DependencyGraphInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(() =>
    initialNodes.map((n) => {
      const d = n.data as { isOrphan?: boolean };
      return d?.isOrphan ? { ...n, hidden: true } : n;
    })
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [orphansCollapsed, setOrphansCollapsed] = useState(true);
  const { fitView } = useReactFlow();
  const edgesRef = useRef(edges);
  edgesRef.current = edges;
  const prevFocusedNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    setEdges(initialEdges);
    const withOrphanVisibility = initialNodes.map((n) => {
      const d = n.data as { isOrphan?: boolean };
      const hidden = d?.isOrphan ? orphansCollapsed : false;
      return hidden ? { ...n, hidden: true } : { ...n, hidden: false };
    });
    setNodes(withOrphanVisibility);
    if (!orphansCollapsed) {
      setTimeout(() => fitView({ duration: 400 }), 50);
    }
  }, [initialNodes, initialEdges, orphansCollapsed, setNodes, setEdges, fitView]);

  const applyFocusOpacity = useCallback(
    (focusedId: string | null) => {
      if (focusedId == null) {
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            style: { ...(n.style ?? {}), opacity: 1 },
          }))
        );
        setEdges((prev) =>
          prev.map((e) => ({
            ...e,
            style: { ...(e.style ?? {}), opacity: 1 },
          }))
        );
        return;
      }
      const edgeList = edgesRef.current;
      const connectedEdgeIds = new Set<string>();
      const connectedNodeIds = new Set<string>([focusedId]);
      edgeList.forEach((e) => {
        if (e.source === focusedId || e.target === focusedId) {
          connectedEdgeIds.add(e.id);
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        }
      });
      setNodes((prev) =>
        prev.map((n) => {
          if (n.type === "sectionDivider" || n.type === "layerLabel")
            return { ...n, style: { ...(n.style ?? {}), opacity: 1 } };
          return {
            ...n,
            style: {
              ...(n.style ?? {}),
              opacity: connectedNodeIds.has(n.id) ? 1 : 0.2,
            },
          };
        })
      );
      setEdges((prev) =>
        prev.map((e) => ({
          ...e,
          style: {
            ...(e.style ?? {}),
            opacity: connectedEdgeIds.has(e.id) ? 1 : 0.1,
          },
        }))
      );
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    if (prevFocusedNodeIdRef.current === focusedNodeId) return;
    prevFocusedNodeIdRef.current = focusedNodeId;
    applyFocusOpacity(focusedNodeId);
  }, [focusedNodeId, applyFocusOpacity]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, clickedNode: Node<NodeData>) => {
      const edgeList = edgesRef.current;
      const connectedEdgeIds = new Set<string>();
      const connectedNodeIds = new Set<string>([clickedNode.id]);
      edgeList.forEach((e) => {
        if (e.source === clickedNode.id || e.target === clickedNode.id) {
          connectedEdgeIds.add(e.id);
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        }
      });
      setNodes((prev) =>
        prev.map((n) => {
          if (n.type === "sectionDivider" || n.type === "layerLabel")
            return { ...n, style: { ...(n.style ?? {}), opacity: 1 } };
          return {
            ...n,
            style: {
              ...(n.style ?? {}),
              opacity: connectedNodeIds.has(n.id) ? 1 : 0.2,
            },
          };
        })
      );
      setEdges((prev) =>
        prev.map((e) => ({
          ...e,
          style: {
            ...(e.style ?? {}),
            opacity: connectedEdgeIds.has(e.id) ? 1 : 0.1,
          },
        }))
      );
      onNodeSelect(clickedNode.type === "file" ? (clickedNode as Node<NodeData>) : null);
    },
    [setNodes, setEdges, onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    setNodes((prev) =>
      prev.map((n) => ({ ...n, style: { ...(n.style ?? {}), opacity: 1 } }))
    );
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        style: { ...(e.style ?? {}), opacity: 1 },
      }))
    );
    onNodeSelect(null);
  }, [setNodes, setEdges, onNodeSelect]);

  return (
    <OrphanToggleContext.Provider
      value={{
        collapsed: orphansCollapsed,
        count: orphanCount,
        onToggle: () => setOrphansCollapsed((v) => !v),
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        fitView
        className="bg-slate-50/30"
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#e2e8f0" />
      <Controls
        className="bg-white border-slate-100 shadow-xl rounded-2xl overflow-hidden [&_button]:h-10 [&_button]:w-10 [&_button]:border-slate-100 [&_button]:hover:bg-slate-50 [&_button]:transition-colors"
        showInteractive={false}
      />
      <GraphController
        searchTarget={searchTarget}
        nodes={nodes}
        setNodes={setNodes}
      />
      <Panel position="bottom-center" className="mb-6">
        <div className="px-5 py-3 rounded-2xl bg-slate-900/90 backdrop-blur-md text-white/90 text-[11px] font-bold tracking-widest uppercase flex items-center gap-4 shadow-2xl">
          <span>Scroll to zoom</span>
          <div className="w-px h-3 bg-white/20" />
          <span>Pan to navigate</span>
          <div className="w-px h-3 bg-white/20" />
          <span>Click node to explain</span>
        </div>
      </Panel>
      <Panel position="bottom-left" className="mb-6 ml-6">
        <div className="px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-100 shadow-xl space-y-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              FILE TYPES
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LEGEND_ITEMS.map(({ ext, bg }) => (
                <span
                  key={ext}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium text-white ${bg}`}
                >
                  {ext}
                </span>
              ))}
            </div>
          </div>
          <div className="h-px bg-slate-100" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              ROLES
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_LEGEND_ITEMS.map(({ label, bg, hint }) => (
                <span
                  key={label}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium text-slate-800 ${bg}`}
                  title={hint}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Panel>
      </ReactFlow>
    </OrphanToggleContext.Provider>
  );
}

export default function DependencyGraph(props: DependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <DependencyGraphInner {...props} />
    </ReactFlowProvider>
  );
}
