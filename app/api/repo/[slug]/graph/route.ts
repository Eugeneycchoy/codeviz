import { NextResponse } from "next/server";
import path from "path";
import dagre from "dagre";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;

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

  const fileIds = new Set(fileList.map((f) => f.id as string));
  const nodes = fileList.map((f) => {
    const id = f.id as string;
    const pathStr = (f.path as string) ?? "";
    const label = path.basename(pathStr) || pathStr || "file";
    return {
      id,
      type: "file" as const,
      position: { x: 0, y: 0 },
      data: { label, path: pathStr },
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

  if (nodes.length > 0) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB" });
    g.setDefaultEdgeLabel(() => ({}));
    for (const n of nodes) {
      g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const e of edges) {
      g.setEdge(e.source, e.target);
    }
    dagre.layout(g);
    for (const n of nodes) {
      const dNode = g.node(n.id);
      if (dNode) {
        n.position = {
          x: dNode.x - NODE_WIDTH / 2,
          y: dNode.y - NODE_HEIGHT / 2,
        };
      }
    }
  }

  return NextResponse.json({
    nodes,
    edges,
    repoName: (repo.name as string) ?? slug,
  });
}
