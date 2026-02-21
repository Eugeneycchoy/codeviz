"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeTypes,
} from "reactflow";
import "reactflow/dist/style.css";
import { type NodeData, FileNode } from "@/components/FileNode";
import { GraphEdge } from "@/components/GraphEdge";
import type { EdgeFilter } from "@/components/GraphHeader";

export type GraphNodeData = NodeData | SectionDividerData;

export type LayerInfo = {
  index: number;
  name: string;
  emoji: string;
  subtitle: string;
  startY: number;
  height: number;
  bg: string;
};

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
  hoveredNodeId: string | null;
  onNodeSelect: (node: Node<NodeData> | null) => void;
  onNodeHover: (nodeId: string | null) => void;
  orphanCount: number;
  edgeFilter: EdgeFilter;
  layers: LayerInfo[];
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

type SectionDividerData = { orphanCount?: number };

type LayerLabelData = { label: string; subtitle: string };

function LayerLabelNode({ data }: NodeProps<LayerLabelData>) {
  return (
    <div className="flex flex-col gap-0.5 pointer-events-none">
      <span className="text-xs font-bold text-gray-700 leading-tight">
        {data.label}
      </span>
      {data.subtitle ? (
        <span className="text-[10px] font-normal text-gray-500 leading-tight">
          {data.subtitle}
        </span>
      ) : null}
    </div>
  );
}

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
        <span aria-hidden>{collapsed ? "\u25B6" : "\u25BC"}</span>
        <span>ISOLATED FILES ({count})</span>
      </button>
    </div>
  );
}

function StartBadgeNode() {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 shadow-md pointer-events-none animate-pulse"
      style={{ boxShadow: "0 0 0 2px rgba(99, 102, 241, 0.3)" }}
    >
      START
    </div>
  );
}

const NODE_TYPES = {
  file: FileNode,
  sectionDivider: SectionDividerNode,
  layerLabel: LayerLabelNode,
  startBadge: StartBadgeNode,
};

const EDGE_TYPES: EdgeTypes = {
  graphEdge: GraphEdge,
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

function DependencyGraphInner({
  initialNodes,
  initialEdges,
  searchTarget,
  focusedNodeId,
  hoveredNodeId,
  onNodeSelect,
  onNodeHover,
  orphanCount,
  edgeFilter,
  layers,
}: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNodeData>(
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
  const prevHoveredNodeIdRef = useRef<string | null>(null);

  // Filter edges by type
  const filteredEdges = useMemo(() => {
    if (edgeFilter === "all") return initialEdges;
    return initialEdges.filter((e) => e.data?.edgeType === edgeFilter);
  }, [initialEdges, edgeFilter]);

  useEffect(() => {
    setEdges(filteredEdges);
    const withOrphanVisibility = initialNodes.map((n) => {
      const d = n.data as { isOrphan?: boolean };
      const hidden = d?.isOrphan ? orphansCollapsed : false;
      return hidden ? { ...n, hidden: true } : { ...n, hidden: false };
    });
    setNodes(withOrphanVisibility);
    if (!orphansCollapsed) {
      setTimeout(() => fitView({ duration: 400 }), 50);
    }
  }, [initialNodes, filteredEdges, orphansCollapsed, setNodes, setEdges, fitView]);

  const applyHighlight = useCallback(
    (activeId: string | null) => {
      if (activeId == null) {
        setNodes((prev) =>
          prev.map((n) => ({
            ...n,
            style: { ...(n.style ?? {}), opacity: 1 },
          }))
        );
        setEdges((prev) =>
          prev.map((e) => ({
            ...e,
            style: { ...(e.style ?? {}), opacity: 0.3 },
          }))
        );
        return;
      }
      const edgeList = edgesRef.current;
      const connectedEdgeIds = new Set<string>();
      const connectedNodeIds = new Set<string>([activeId]);
      edgeList.forEach((e) => {
        if (e.source === activeId || e.target === activeId) {
          connectedEdgeIds.add(e.id);
          connectedNodeIds.add(e.source);
          connectedNodeIds.add(e.target);
        }
      });
      setNodes((prev) =>
        prev.map((n) => {
          if (n.type === "sectionDivider")
            return { ...n, style: { ...(n.style ?? {}), opacity: 1 } };
          return {
            ...n,
            style: {
              ...(n.style ?? {}),
              opacity: connectedNodeIds.has(n.id) ? 1 : 0.1,
            },
          };
        })
      );
      setEdges((prev) =>
        prev.map((e) => ({
          ...e,
          style: {
            ...(e.style ?? {}),
            opacity: connectedEdgeIds.has(e.id) ? 0.95 : 0.08,
          },
        }))
      );
    },
    [setNodes, setEdges]
  );

  // Apply highlight for selected node
  useEffect(() => {
    if (prevFocusedNodeIdRef.current === focusedNodeId) return;
    prevFocusedNodeIdRef.current = focusedNodeId;
    // Only apply focus highlight if nothing is hovered
    if (hoveredNodeId == null) {
      applyHighlight(focusedNodeId);
    }
  }, [focusedNodeId, hoveredNodeId, applyHighlight]);

  // Apply highlight for hovered node (takes priority)
  useEffect(() => {
    if (prevHoveredNodeIdRef.current === hoveredNodeId) return;
    prevHoveredNodeIdRef.current = hoveredNodeId;
    if (hoveredNodeId != null) {
      applyHighlight(hoveredNodeId);
    } else {
      // Revert to focused node highlight or clear
      applyHighlight(focusedNodeId);
    }
  }, [hoveredNodeId, focusedNodeId, applyHighlight]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, clickedNode: Node<NodeData>) => {
      if (clickedNode.type !== "file") {
        onNodeSelect(null);
        return;
      }
      onNodeSelect(clickedNode as Node<NodeData>);
    },
    [onNodeSelect]
  );

  const onNodeMouseEnter = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === "file") {
        onNodeHover(node.id);
      }
    },
    [onNodeHover]
  );

  const onNodeMouseLeave = useCallback(() => {
    onNodeHover(null);
  }, [onNodeHover]);

  const onPaneClick = useCallback(() => {
    applyHighlight(null);
    onNodeSelect(null);
  }, [applyHighlight, onNodeSelect]);

  // Build layer band nodes for background rendering
  const layerBandNodes: Node[] = useMemo(() => {
    // We need the maxRowWidth to size the bands. Compute from connected nodes.
    const fileNodes = initialNodes.filter((n) => n.type === "file");
    let maxX = 0;
    for (const n of fileNodes) {
      const right = (n.position?.x ?? 0) + NODE_WIDTH;
      if (right > maxX) maxX = right;
    }
    const bandWidth = Math.max(maxX + 80, 900);

    return layers.map((layer) => ({
      id: `layer-band-${layer.index}`,
      type: "group",
      position: { x: -40, y: layer.startY },
      data: {},
      style: {
        width: bandWidth,
        height: layer.height,
        background: layer.bg,
        opacity: 0.55,
        borderRadius: 10,
        border: "none",
        pointerEvents: "none" as const,
        zIndex: -1,
      },
      selectable: false,
      draggable: false,
      connectable: false,
    }));
  }, [layers, initialNodes]);

  // Build layer label nodes (title + subtitle overlay on bands)
  const layerLabelNodes: Node[] = useMemo(() => {
    return layers.map((layer) => ({
      id: `layer-title-${layer.index}`,
      type: "layerLabel",
      position: { x: -22, y: layer.startY + 10 },
      data: {
        label: `${layer.emoji} ${layer.name}`,
        subtitle: layer.subtitle,
      },
      selectable: false,
      draggable: false,
      connectable: false,
      style: {
        background: "transparent",
        border: "none",
        boxShadow: "none",
        pointerEvents: "none" as const,
        padding: 0,
        width: "auto",
      },
    }));
  }, [layers]);

  // Pulsing START badge anchored to first entry node; visible only when nothing is selected/hovered
  const startBadgeNodes: Node[] = useMemo(() => {
    if (focusedNodeId != null || hoveredNodeId != null) return [];
    const firstEntry = initialNodes.find(
      (n) =>
        n.type === "file" &&
        (n.data as NodeData).role === "entry"
    );
    if (!firstEntry?.position) return [];
    const x = firstEntry.position.x ?? 0;
    const y = firstEntry.position.y ?? 0;
    return [
      {
        id: "start-badge",
        type: "startBadge",
        position: { x: x - 4, y: y - 28 },
        data: {},
        selectable: false,
        draggable: false,
        connectable: false,
        style: { pointerEvents: "none" as const },
      },
    ];
  }, [initialNodes, focusedNodeId, hoveredNodeId]);

  // Merge all nodes
  const allNodes = useMemo(() => {
    return [...layerBandNodes, ...layerLabelNodes, ...startBadgeNodes, ...nodes];
  }, [layerBandNodes, layerLabelNodes, startBadgeNodes, nodes]);

  return (
    <OrphanToggleContext.Provider
      value={{
        collapsed: orphansCollapsed,
        count: orphanCount,
        onToggle: () => setOrphansCollapsed((v) => !v),
      }}
    >
      <ReactFlow
        nodes={allNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={false}
        fitView
        fitViewOptions={{ padding: 0.1, minZoom: 0.2, maxZoom: 1.2 }}
        className="bg-slate-50/30"
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1} color="#e2e8f0" />
        <Controls
          className="bg-white border-slate-100 shadow-xl rounded-2xl overflow-hidden [&_button]:h-10 [&_button]:w-10 [&_button]:border-slate-100 [&_button]:hover:bg-slate-50 [&_button]:transition-colors"
          showInteractive={false}
          onFitView={() => fitView({ duration: 400, padding: 0.1 })}
        />
        <GraphController
          searchTarget={searchTarget}
          nodes={nodes}
          setNodes={setNodes}
        />
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
