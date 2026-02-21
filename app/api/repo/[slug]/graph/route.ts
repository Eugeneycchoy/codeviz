import { NextResponse } from "next/server";
import path from "path";
import dagre from "dagre";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { detectStack, classifyLayerWithProfile } from "@/lib/stack-profiles";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const H_GAP = 28;

const BAND_PADDING = 32;
const LAYER_GAP = 52;
/** Target width for each layer band so dagre x is scaled to a consistent canvas width. */
const BAND_WIDTH = 880;
/** Orphan grid: columns fit within band width; vertical gap and top padding. */
const GRID_COLUMNS = Math.max(1, Math.floor(BAND_WIDTH / (NODE_WIDTH + H_GAP)));
const V_GAP = 20;
const ORPHAN_GRID_TOP_PADDING = 20;

function computeRole(inDegree: number, outDegree: number): string {
  if (inDegree === 0 && outDegree > 0) return "entry";
  if (inDegree >= 3) return "hub";
  if (inDegree >= 2) return "shared";
  return "leaf";
}

function tryParseJson(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

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
    .select("id, path, language")
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

  // Detect stack profile from file paths + package.json content
  const pkgFile = fileList.find((f) => (f.path as string).endsWith("package.json"));
  let parsedPkg: Record<string, unknown> | null = null;
  if (pkgFile) {
    const { data: pkgContent } = await supabaseAdmin
      .from("repo_files")
      .select("content")
      .eq("id", pkgFile.id as string)
      .single();
    if (pkgContent?.content) {
      parsedPkg = tryParseJson(pkgContent.content as string);
    }
  }
  const profile = detectStack(
    fileList.map((f) => ({ path: f.path as string })),
    parsedPkg,
  );

  // Build path lookup for edge type inference
  const filePathMap = new Map<string, string>();
  for (const f of fileList) {
    filePathMap.set(f.id as string, (f.path as string) ?? "");
  }

  const fileIds = new Set(fileList.map((f) => f.id as string));

  // Compute degree maps
  const inDegreeMap = new Map<string, number>();
  const outDegreeMap = new Map<string, number>();
  for (const e of edgeList) {
    const src = e.source_file_id as string;
    const tgt = e.target_file_id as string;
    if (fileIds.has(src) && fileIds.has(tgt)) {
      outDegreeMap.set(src, (outDegreeMap.get(src) ?? 0) + 1);
      inDegreeMap.set(tgt, (inDegreeMap.get(tgt) ?? 0) + 1);
    }
  }

  type FileNodeItem = {
    id: string;
    type: "file";
    position: { x: number; y: number };
    data: {
      label: string;
      path: string;
      layer: number;
      language: string;
      role: string;
      inDegree: number;
      outDegree: number;
      isOrphan: boolean;
    };
  };

  const nodes: FileNodeItem[] = fileList.map((f) => {
    const id = f.id as string;
    const pathStr = (f.path as string) ?? "";
    const label = path.basename(pathStr) || pathStr || "file";
    const layer = classifyLayerWithProfile(profile, pathStr);
    const language = (f.language as string) ?? "";
    const inDeg = inDegreeMap.get(id) ?? 0;
    const outDeg = outDegreeMap.get(id) ?? 0;
    const role = computeRole(inDeg, outDeg);
    return {
      id,
      type: "file" as const,
      position: { x: 0, y: 0 },
      data: { label, path: pathStr, layer, language, role, inDegree: inDeg, outDegree: outDeg, isOrphan: false },
    };
  });

  const edges = edgeList
    .filter(
      (e) =>
        fileIds.has(e.source_file_id as string) &&
        fileIds.has(e.target_file_id as string)
    )
    .map((e) => {
      const targetPath = filePathMap.get(e.target_file_id as string) ?? "";
      const edgeType = profile.inferEdgeType(targetPath);
      return {
        id: `e-${e.source_file_id}-${e.target_file_id}`,
        source: e.source_file_id as string,
        target: e.target_file_id as string,
        type: "graphEdge",
        data: {
          edgeType,
          label: path.basename(targetPath),
        },
      };
    });

  let maxY = 0;

  const fileNodes = nodes.filter((n): n is FileNodeItem => n.type === "file");
  const connectedIds = new Set<string>();
  for (const e of edges) {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  }

  // Group ALL file nodes by layer
  const layerToNodes = new Map<number, FileNodeItem[]>();
  for (const n of fileNodes) {
    const layerIndex = n.data.layer;
    const list = layerToNodes.get(layerIndex) ?? [];
    list.push(n);
    layerToNodes.set(layerIndex, list);
  }

  // Build and layout a dagre graph per layer (only that layer's nodes and intra-layer edges)
  type LayerBounds = { minX: number; maxX: number; minY: number; maxY: number };
  const layerBounds = new Map<number, LayerBounds>();
  const layerDagreGraphs = new Map<number, dagre.graphlib.Graph>();

  for (const [layerIndex, layerNodes] of Array.from(layerToNodes.entries())) {
    const layerIdSet = new Set(layerNodes.map((n) => n.id));
    const layerEdges = edges.filter(
      (e) => layerIdSet.has(e.source) && layerIdSet.has(e.target)
    );
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 28, nodesep: 32 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const n of layerNodes) {
      g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const e of layerEdges) {
      g.setEdge(e.source, e.target);
    }
    dagre.layout(g);
    layerDagreGraphs.set(layerIndex, g);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const node of layerNodes) {
      const d = g.node(node.id);
      if (d) {
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        minY = Math.min(minY, d.y);
        maxY = Math.max(maxY, d.y);
      }
    }
    if (minX === Infinity) minX = maxX = minY = maxY = 0;
    const spanY = maxY - minY;
    if (spanY === 0) {
      maxY = minY + NODE_HEIGHT;
    }
    layerBounds.set(layerIndex, { minX, maxX, minY, maxY });
  }

  /** Band height from dagre-computed span for nodes in this layer (multiple ranks within band). */
  function getLayerBandHeight(layerIndex: number): number {
    const bounds = layerBounds.get(layerIndex);
    if (!bounds) return NODE_HEIGHT + BAND_PADDING * 2;
    const spanY = bounds.maxY - bounds.minY;
    return spanY + NODE_HEIGHT + BAND_PADDING * 2;
  }

  // Compute layer start Y from dagre-derived band heights
  const layerStartY = new Map<number, number>();
  let currentY = 0;
  for (let layerIndex = 0; layerIndex < profile.layers.length; layerIndex++) {
    const layerNodes = layerToNodes.get(layerIndex);
    if (layerNodes && layerNodes.length > 0) {
      layerStartY.set(layerIndex, currentY);
      currentY += getLayerBandHeight(layerIndex) + LAYER_GAP;
    }
  }

  // Position nodes: per-layer dagre (x,y) mapped into each band
  for (const [layerIndex, layerNodes] of Array.from(layerToNodes.entries())) {
    const startY = layerStartY.get(layerIndex) ?? 0;
    const bounds = layerBounds.get(layerIndex)!;
    const bandHeight = getLayerBandHeight(layerIndex);
    const contentHeight = bandHeight - BAND_PADDING * 2;
    const spanX = Math.max(bounds.maxX - bounds.minX, 1);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1);
    const dagreGraph = layerDagreGraphs.get(layerIndex)!;

    const connectedInLayer = layerNodes.filter((n) => connectedIds.has(n.id));
    const orphansInLayer = layerNodes.filter((n) => !connectedIds.has(n.id));

    // Mark orphans for this layer so response matches DependencyGraph's expected contract
    for (const node of orphansInLayer) {
      node.data.isOrphan = true;
    }

    // Connected nodes: map this layer's dagre (x,y) to position; x scaled to band, y within band
    for (const node of connectedInLayer) {
      const d = dagreGraph.node(node.id);
      if (d) {
        const t = spanX > 0 ? (d.x - bounds.minX) / spanX : 0;
        const scaledCenterX = Math.max(0, Math.min(1, t)) * (BAND_WIDTH - NODE_WIDTH) + NODE_WIDTH / 2;
        node.position.x = scaledCenterX - NODE_WIDTH / 2;
        const yOffsetInBand = spanY > 0 ? (d.y - bounds.minY) / spanY : 0;
        const centerY = startY + BAND_PADDING + yOffsetInBand * contentHeight;
        node.position.y = centerY - NODE_HEIGHT / 2;
      }
    }
  }

  for (const [layerIndex, layerNodes] of Array.from(layerToNodes.entries())) {
    const h = (layerStartY.get(layerIndex) ?? 0) + getLayerBandHeight(layerIndex);
    if (h > maxY) maxY = h;
  }

  const orphanCount = fileNodes.filter((n) => n.data.isOrphan).length;

  const SECTION_DIVIDER_HEIGHT = 50;
  const responseNodes: (FileNodeItem | { id: string; type: "sectionDivider"; position: { x: number; y: number }; data: { orphanCount: number } })[] = [...nodes];
  if (orphanCount > 0) {
    const sectionDividerY = maxY + LAYER_GAP;
    responseNodes.push({
      id: "section-divider-orphans",
      type: "sectionDivider",
      position: { x: 0, y: sectionDividerY },
      data: { orphanCount },
    });
    const allOrphans = fileNodes
      .filter((n) => n.data.isOrphan)
      .sort((a, b) => a.data.layer - b.data.layer || a.data.path.localeCompare(b.data.path));
    const numRows = Math.ceil(orphanCount / GRID_COLUMNS);
    allOrphans.forEach((node, i) => {
      const col = i % GRID_COLUMNS;
      const row = Math.floor(i / GRID_COLUMNS);
      node.position.x = col * (NODE_WIDTH + H_GAP);
      node.position.y =
        sectionDividerY +
        SECTION_DIVIDER_HEIGHT +
        ORPHAN_GRID_TOP_PADDING +
        row * (NODE_HEIGHT + V_GAP);
    });
    maxY =
      sectionDividerY +
      SECTION_DIVIDER_HEIGHT +
      ORPHAN_GRID_TOP_PADDING +
      numRows * (NODE_HEIGHT + V_GAP);
  }

  // Build layers array for the response
  const layers: { index: number; name: string; emoji: string; subtitle: string; startY: number; height: number; bg: string }[] = [];
  for (const [layerIndex, startY] of Array.from(layerStartY.entries())) {
    const layerNodes = layerToNodes.get(layerIndex);
    if (!layerNodes || layerNodes.length === 0) continue;
    const layerDef = profile.layers[layerIndex];
    layers.push({
      index: layerIndex,
      name: layerDef.name,
      emoji: layerDef.emoji,
      subtitle: layerDef.subtitle,
      startY,
      height: getLayerBandHeight(layerIndex),
      bg: layerDef.bg,
    });
  }

  return NextResponse.json({
    nodes: responseNodes,
    edges,
    layers,
    repoName: (repo.name as string) ?? slug,
    stackId: profile.id,
    stackName: profile.displayName,
    maxY,
    orphanCount,
  });
}
