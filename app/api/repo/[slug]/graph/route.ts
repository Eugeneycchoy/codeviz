import { NextResponse } from "next/server";
import path from "path";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { FIXED_LAYERS, classifyFileToLayer, classifyFileToModule } from "@/lib/layers";
import type { FileClassificationRule } from "@/lib/codebase-analysis";

function computeRole(inDegree: number, outDegree: number): string {
  if (inDegree === 0 && outDegree > 0) return "entry";
  if (inDegree >= 3) return "hub";
  if (inDegree >= 2) return "shared";
  return "leaf";
}

/** Classify a file path using AI-generated rules. First match wins; last rule is catch-all. */
function classifyWithRules(
  rules: FileClassificationRule[],
  filePath: string
): { layerIndex: number; moduleName: string } {
  const p = filePath.replace(/\\/g, "/");
  for (const rule of rules) {
    if (!rule.match) continue;
    if (rule.match?.is_catchall) continue;
    const path_prefixes = rule.match?.path_prefixes ?? [];
    const path_contains = rule.match?.path_contains ?? [];
    const path_suffixes = rule.match?.path_suffixes ?? [];
    if (path_prefixes.length === 0 && path_contains.length === 0 && path_suffixes.length === 0) continue;
    const prefixMatch = path_prefixes.length === 0 || path_prefixes.some((pfx) => p.startsWith(pfx));
    const containsMatch = path_contains.length === 0 || path_contains.some((sub) => p.includes(sub));
    const suffixMatch = path_suffixes.length === 0 || path_suffixes.some((sfx) => p.endsWith(sfx));
    if (prefixMatch && containsMatch && suffixMatch) {
      return { layerIndex: rule.layer_index, moduleName: rule.module_name };
    }
  }
  // Fall through to catch-all
  const catchAll = rules.find((r) => r.match?.is_catchall);
  if (catchAll) {
    return { layerIndex: catchAll.layer_index, moduleName: catchAll.module_name };
  }
  return { layerIndex: 4, moduleName: "Config" };
}

/** Generic path-based edge type inference. */
function inferEdgeType(targetPath: string): "composition" | "data" | "utility" {
  const p = targetPath.replace(/\\/g, "/");
  if (p.includes("/components/") || p.endsWith(".vue") || /\/(page|layout)\.(tsx|jsx|ts|js)$/.test(p)) return "composition";
  if (p.includes("/api/") || p.includes("/models/") || p.includes("/store/") || p.includes("/db/")) return "data";
  return "utility";
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
    .select("id, name, user_id, layer_config, detected_stack_id")
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
  const rawConfig = repo.layer_config as FileClassificationRule[] | null;

  // Validate that layer_config looks like the new format (has layer_index + module_name + match)
  // for every rule; fall back to null if any rule is malformed
  const hasValidRules =
    Array.isArray(rawConfig) &&
    rawConfig.length > 0 &&
    rawConfig.every(
      (r) =>
        typeof r.layer_index === "number" &&
        typeof r.module_name === "string" &&
        r.match != null &&
        typeof r.match === "object"
    ) &&
    rawConfig.some((r) => !r.match?.is_catchall);
  const rules: FileClassificationRule[] | null = hasValidRules ? rawConfig : null;

  console.log(`[graph/${slug}] Classification: ${rules ? `AI rules (${rules.length} rules, ${rules.filter((r) => !r.match?.is_catchall).length} non-catch-all)` : "heuristic fallback"}`);

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
    .select("source_file_id, target_file_id, edge_type")
    .eq("repo_id", repoId);
  if (edgesError) {
    return NextResponse.json(
      { error: "Failed to load edges" },
      { status: 500 }
    );
  }
  const edgeList = edgeRows ?? [];

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

  // Build path lookup for edge type inference
  const filePathMap = new Map<string, string>();
  for (const f of fileList) {
    filePathMap.set(f.id as string, (f.path as string) ?? "");
  }

  // Classify each file into (layerIndex, moduleName)
  type ClassifiedFile = {
    id: string;
    label: string;
    path: string;
    language: string;
    role: string;
    inDegree: number;
    outDegree: number;
    layerIndex: number;
    moduleName: string;
  };

  const classifiedFiles: ClassifiedFile[] = fileList.map((f) => {
    const id = f.id as string;
    const pathStr = (f.path as string) ?? "";
    const label = path.basename(pathStr) || pathStr || "file";
    const language = (f.language as string) ?? "";
    const inDeg = inDegreeMap.get(id) ?? 0;
    const outDeg = outDegreeMap.get(id) ?? 0;
    const role = computeRole(inDeg, outDeg);

    let layerIndex: number;
    let moduleName: string;
    if (rules) {
      const result = classifyWithRules(rules, pathStr);
      layerIndex = result.layerIndex;
      moduleName = result.moduleName;
    } else {
      layerIndex = classifyFileToLayer(pathStr);
      moduleName = classifyFileToModule(pathStr);
    }

    return { id, label, path: pathStr, language, role, inDegree: inDeg, outDegree: outDeg, layerIndex, moduleName };
  });

  // Group files into modules
  const moduleMap = new Map<string, { layerIndex: number; moduleName: string; files: ClassifiedFile[] }>();
  for (const f of classifiedFiles) {
    const key = `${f.layerIndex}/${f.moduleName}`;
    let mod = moduleMap.get(key);
    if (!mod) {
      mod = { layerIndex: f.layerIndex, moduleName: f.moduleName, files: [] };
      moduleMap.set(key, mod);
    }
    mod.files.push(f);
  }

  // Sort modules by layer index, then by module name
  const modules = Array.from(moduleMap.values()).sort((a, b) => {
    if (a.layerIndex !== b.layerIndex) return a.layerIndex - b.layerIndex;
    return a.moduleName.localeCompare(b.moduleName);
  });

  // Log layer distribution
  const layerCounts = new Map<number, number>();
  for (const f of classifiedFiles) {
    layerCounts.set(f.layerIndex, (layerCounts.get(f.layerIndex) ?? 0) + 1);
  }
  const LAYER_NAMES = ["Interface", "Services", "Data", "Shared", "Platform"];
  const distribution = LAYER_NAMES.map((name, i) => `${name}=${layerCounts.get(i) ?? 0}`).join(", ");
  console.log(`[graph/${slug}] ${classifiedFiles.length} files → ${distribution}`);

  // Build edges
  const VALID_EDGE_TYPES = ["composition", "data", "utility"] as const;
  const edges = edgeList
    .filter(
      (e) =>
        fileIds.has(e.source_file_id as string) &&
        fileIds.has(e.target_file_id as string)
    )
    .map((e) => {
      const targetPath = filePathMap.get(e.target_file_id as string) ?? "";
      const stored = e.edge_type as string | null | undefined;
      const edgeType =
        stored && VALID_EDGE_TYPES.includes(stored as (typeof VALID_EDGE_TYPES)[number])
          ? (stored as (typeof VALID_EDGE_TYPES)[number])
          : inferEdgeType(targetPath);
      return {
        id: `e-${e.source_file_id}-${e.target_file_id}`,
        source: e.source_file_id as string,
        target: e.target_file_id as string,
        edgeType,
      };
    });

  // Determine stack name from detected_stack_id
  const detectedStackId = (repo.detected_stack_id as string | null) ?? null;
  const STACK_NAMES: Record<string, string> = {
    nextjs: "Next.js",
    react: "React",
    angular: "Angular",
    vue: "Vue",
    django: "Django",
    express: "Express",
    "static-html": "HTML/CSS/JS",
    generic: "Generic",
  };
  const stackName = detectedStackId ? STACK_NAMES[detectedStackId] ?? detectedStackId : undefined;

  return NextResponse.json({
    repoName: (repo.name as string) ?? slug,
    stackId: detectedStackId,
    stackName,
    layers: FIXED_LAYERS,
    modules: modules.map((m) => ({
      layerIndex: m.layerIndex,
      moduleName: m.moduleName,
      files: m.files.map((f) => ({
        id: f.id,
        label: f.label,
        path: f.path,
        language: f.language,
        role: f.role,
        inDegree: f.inDegree,
        outDegree: f.outDegree,
      })),
    })),
    edges,
  });
}
