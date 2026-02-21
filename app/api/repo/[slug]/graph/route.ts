import { NextResponse } from "next/server";
import path from "path";
import dagre from "dagre";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const H_GAP = 40;

const MAX_NODES_PER_ROW = 5;
const V_ROW_GAP = 40;
const BAND_PADDING = 50;
const LAYER_GAP = 80;
const ORPHAN_GAP = 80;
const LAYER_NAMES = ["PAGES", "API ROUTES", "COMPONENTS", "LIBRARY", "CONFIG"] as const;

function computeLayerHeight(count: number): number {
  const rows = Math.ceil(count / MAX_NODES_PER_ROW);
  return rows * NODE_HEIGHT + (rows - 1) * V_ROW_GAP + BAND_PADDING * 2;
}

/**
 * Classifies a file path into a functional layer for Next.js role grouping.
 * Layer 0 = PAGES, 1 = API ROUTES, 2 = COMPONENTS, 3 = LIBRARY, 4 = CONFIG.
 */
function classifyLayer(filePath: string): number {
  const p = filePath.replace(/\\/g, "/");
  if (p.startsWith("app/api/")) return 1;
  if (p.startsWith("app/")) {
    if (
      p.endsWith("/page.tsx") ||
      p.endsWith("/page.jsx") ||
      p.endsWith("/layout.tsx") ||
      p.endsWith("/layout.jsx")
    )
      return 0;
  }
  if (p.startsWith("components/")) return 2;
  if (p.startsWith("lib/")) return 3;
  return 4;
}

/**
 * GET /api/repo/[slug]/graph
 * Resolves repo by slug and user; returns { nodes, edges, repoName } for React Flow.
 * Auth required.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Slug required" }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const { data: repo, error: repoError } = await supabaseAdmin
    .from("repositories")
    .select("id, name, user_id")
    .eq("user_id", session.user.id)
    .eq("slug", slug)
    .single();
  if (repoError || !repo) {
    return NextResponse.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  }
  if (repo.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const repoId = repo.id as string;

  const { data: files, error: filesError } = await supabaseAdmin
    .from("repo_files")
    .select("id, path")
    .eq("repo_id", repoId);
  if (filesError) {
    return NextResponse.json(
      { error: "Failed to load files" },
      { status: 500 }
    );
  }
  const fileList = files ?? [];

  const { data: edgeRows, error: edgesError } = await supabaseAdmin
    .from("graph_edges")
    .select("source_file_id, target_file_id")
    .eq("repo_id", repoId);
  if (edgesError) {
    return NextResponse.json(
      { error: "Failed to load edges" },
      { status: 500 }
    );
  }
  const edgeList = edgeRows ?? [];

  type FileNodeItem = {
    id: string;
    type: "file";
    position: { x: number; y: number };
    data: { label: string; path: string; layer: number; isOrphan?: boolean };
  };
  type LayerLabelNodeItem = {
    id: string;
    type: "layerLabel";
    position: { x: number; y: number };
    data: { label: string };
    selectable: boolean;
    draggable: boolean;
  };
  type SectionDividerNodeItem = {
    id: string;
    type: "sectionDivider";
    position: { x: number; y: number };
    data: { orphanCount: number };
    selectable: boolean;
    draggable: boolean;
  };
  type GraphNode = FileNodeItem | LayerLabelNodeItem | SectionDividerNodeItem;

  const fileIds = new Set(fileList.map((f) => f.id as string));
  const nodes: GraphNode[] = fileList.map((f) => {
    const id = f.id as string;
    const pathStr = (f.path as string) ?? "";
    const label = path.basename(pathStr) || pathStr || "file";
    const layer = classifyLayer(pathStr);
    return {
      id,
      type: "file" as const,
      position: { x: 0, y: 0 },
      data: { label, path: pathStr, layer },
    };
  });

  const edges = edgeList
    .filter(
      (e) =>
        fileIds.has(e.source_file_id as string) &&
        fileIds.has(e.target_file_id as string)
    )
    .map((e) => ({
      id: `e-${e.source_file_id}-${e.target_file_id}`,
      source: e.source_file_id as string,
      target: e.target_file_id as string,
      animated: true,
      markerEnd: { type: "arrowclosed" as const, color: "#3b82f6" },
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    }));

  let maxY = 0;

  const fileNodes = nodes.filter((n): n is FileNodeItem => n.type === "file");
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }
  const connectedNodes = fileNodes.filter((n) => connectedIds.has(n.id));
  const orphanNodes = fileNodes.filter((n) => !connectedIds.has(n.id));

  if (connectedNodes.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB" });
    g.setDefaultEdgeLabel(() => ({}));
    for (const n of connectedNodes) {
      g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const e of edges) {
      g.setEdge(e.source, e.target);
    }
    dagre.layout(g);

    // Step 1 — Group connected nodes by layer and sort by dagre X.
    const layerToNodes = new Map<number, FileNodeItem[]>();
    for (const n of connectedNodes) {
      const dNode = g.node(n.id);
      const layerIndex = n.data.layer;
      const list = layerToNodes.get(layerIndex) ?? [];
      list.push(n);
      layerToNodes.set(layerIndex, list);
    }
    Array.from(layerToNodes.values()).forEach((layerNodes) => {
      layerNodes.sort((a, b) => {
        const ax = g.node(a.id)?.x ?? 0;
        const bx = g.node(b.id)?.x ?? 0;
        return ax - bx;
      });
    });

    // Step 2 — Compute maxRowWidth (canvas width = widest possible row).
    const maxNodesInAnyLayer =
      layerToNodes.size > 0
        ? Math.max(
            ...Array.from(layerToNodes.values()).map((arr) => arr.length)
          )
        : 0;
    const maxRowWidth =
      Math.min(maxNodesInAnyLayer, MAX_NODES_PER_ROW) * (NODE_WIDTH + H_GAP) -
      H_GAP;

    // Step 3 — Compute cumulative layer start Y positions.
    const layerStartY = new Map<number, number>();
    let currentY = 0;
    for (let layerIndex = 0; layerIndex < LAYER_NAMES.length; layerIndex++) {
      const layerNodes = layerToNodes.get(layerIndex);
      if (layerNodes) {
        layerStartY.set(layerIndex, currentY);
        currentY += computeLayerHeight(layerNodes.length) + LAYER_GAP;
      }
    }

    // Step 4 — Position each node.
    for (const [layerIndex, layerNodes] of Array.from(layerToNodes.entries())) {
      const count = layerNodes.length;
      const startY = layerStartY.get(layerIndex) ?? 0;
      for (let i = 0; i < layerNodes.length; i++) {
        const node = layerNodes[i];
        const row = Math.floor(i / MAX_NODES_PER_ROW);
        const col = i % MAX_NODES_PER_ROW;
        const nodesInThisRow = Math.min(
          MAX_NODES_PER_ROW,
          count - row * MAX_NODES_PER_ROW
        );
        const rowWidth =
          nodesInThisRow * (NODE_WIDTH + H_GAP) - H_GAP;
        const rowStartX = (maxRowWidth - rowWidth) / 2;
        node.position.x = rowStartX + col * (NODE_WIDTH + H_GAP);
        node.position.y =
          startY + BAND_PADDING + row * (NODE_HEIGHT + V_ROW_GAP);
      }
    }

    // Step 5 — Inject layerLabel nodes.
    for (const [layerIndex, layerNodes] of Array.from(layerToNodes.entries())) {
      const count = layerNodes.length;
      const y =
        (layerStartY.get(layerIndex) ?? 0) + computeLayerHeight(count) / 2;
      nodes.push({
        id: `layer-label-${layerIndex}`,
        type: "layerLabel",
        position: { x: -220, y },
        data: { label: LAYER_NAMES[layerIndex] },
        selectable: false,
        draggable: false,
      });
    }

    // Step 6 — Compute maxY for orphan section.
    for (const [layerIndex, layerNodes] of Array.from(layerToNodes.entries())) {
      const h = (layerStartY.get(layerIndex) ?? 0) + computeLayerHeight(layerNodes.length);
      if (h > maxY) maxY = h;
    }
  }

  if (orphanNodes.length > 0) {
    // Step 7 — Orphan grid (multi-row, same algorithm).
    const orphanCount = orphanNodes.length;
    const orphanMaxRowWidth =
      Math.min(orphanCount, MAX_NODES_PER_ROW) * (NODE_WIDTH + H_GAP) - H_GAP;
    const sectionY = maxY + ORPHAN_GAP;
    const orphanRowY = maxY + ORPHAN_GAP * 2;

    nodes.push({
      id: "orphan-divider",
      type: "sectionDivider",
      position: { x: 0, y: sectionY },
      data: { orphanCount },
      selectable: false,
      draggable: false,
    });

    for (let i = 0; i < orphanNodes.length; i++) {
      const orphan = orphanNodes[i];
      const row = Math.floor(i / MAX_NODES_PER_ROW);
      const col = i % MAX_NODES_PER_ROW;
      const nodesInThisRow = Math.min(
        MAX_NODES_PER_ROW,
        orphanCount - row * MAX_NODES_PER_ROW
      );
      const rowWidth =
        nodesInThisRow * (NODE_WIDTH + H_GAP) - H_GAP;
      const rowStartX = (orphanMaxRowWidth - rowWidth) / 2;
      orphan.position.x = rowStartX + col * (NODE_WIDTH + H_GAP);
      orphan.position.y = orphanRowY + row * (NODE_HEIGHT + V_ROW_GAP);
      orphan.data.isOrphan = true;
    }
  }

  return NextResponse.json({
    nodes,
    edges,
    repoName: (repo.name as string) ?? slug,
    maxY,
    orphanCount: orphanNodes.length,
  });
}
