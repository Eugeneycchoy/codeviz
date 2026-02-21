/**
 * Shared helpers for repo ingestion (ZIP path and future T4 git URL path).
 * Used by POST /api/repo/ingest and reusable by T4.
 */
import path from "path";
import ignore, { type Ignore } from "ignore";
import { parseImports } from "./parser";
import { detectStack } from "./stack-profiles";
import type { SupabaseClient } from "@supabase/supabase-js";

const SKIP_PATH_CONTAINS = ["node_modules/", ".git/", "dist/", "build/"];
const SKIP_FILENAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
]);
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".ico",
  ".pdf",
  ".exe",
  ".bin",
  ".pyc",
  ".class",
  ".map",
]);

export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoFileWithLanguage extends RepoFile {
  language: string | null;
}

const MAX_FILES = 1000;
// Skip individual files larger than 500 KB — these are typically
// minified bundles, compiled output, or data blobs that aren't
// useful for code visualization and blow up Supabase REST payloads.
const MAX_FILE_CONTENT_BYTES = 500 * 1024;

/**
 * Detects language from file extension for display/analysis.
 */
export function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) return "typescript";
  if (ext === ".py") return "python";
  if (ext === ".css") return "css";
  if ([".scss", ".sass"].includes(ext)) return "scss";
  if ([".html", ".htm"].includes(ext)) return "html";
  if (ext === ".vue") return "vue";
  if (ext === ".json") return "json";
  if (ext === ".md") return "markdown";
  if (ext === ".go") return "go";
  if (ext === ".rb") return "ruby";
  if (ext === ".java") return "java";
  if (ext === ".rs") return "rust";
  if (ext === ".php") return "php";
  if ([".yaml", ".yml"].includes(ext)) return "yaml";
  if (ext === ".toml") return "toml";
  return null;
}

/**
 * Filters extracted repo files: skip dirs, lockfiles, binary, ignored paths, and apply .gitignore.
 * Shared with T4 for git URL path. Throws if file count after filter > MAX_FILES (caller should catch and return 400).
 */
export function filterRepoFiles(
  files: RepoFile[],
  repoName: string
): RepoFile[] {
  const normalizedRepo = repoName.replace(/\/$/, "");
  const gitignorePath1 = ".gitignore";
  const gitignorePath2 = normalizedRepo ? `${normalizedRepo}/.gitignore` : null;
  let gitignoreContent: string | null = null;
  let gitignoreRoot: "" | string = ""; // "" or "reponame/"

  for (const f of files) {
    const p = f.path.replace(/^\.\//, "");
    if (p === gitignorePath1 || (gitignorePath2 && p === gitignorePath2)) {
      gitignoreContent = f.content;
      gitignoreRoot = p.includes("/") ? p.slice(0, p.indexOf(".gitignore")) : "";
      break;
    }
  }

  let ignorer: Ignore | null = null;
  if (gitignoreContent) {
    ignorer = ignore().add(gitignoreContent);
  }

  const filtered: RepoFile[] = [];
  for (const f of files) {
    const p = f.path.replace(/^\.\//, "");
    if (SKIP_PATH_CONTAINS.some((skip) => p.includes(skip))) continue;
    const base = path.posix.basename(p);
    if (SKIP_FILENAMES.has(base)) continue;
    const ext = path.extname(p).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) continue;
    if (f.content.length > MAX_FILE_CONTENT_BYTES) continue;
    if (ignorer) {
      const pathForIgnore =
        gitignoreRoot && p.startsWith(gitignoreRoot)
          ? p.slice(gitignoreRoot.length)
          : p;
      if (pathForIgnore.startsWith("./")) continue;
      if (ignorer.ignores(pathForIgnore)) continue;
    }
    filtered.push(f);
  }

  if (filtered.length > MAX_FILES) {
    throw new Error("REPO_FILE_LIMIT");
  }
  return filtered;
}

/**
 * Resolves a relative import to a single path for exact map lookup (spec: no extension fallback).
 */
function resolveImportToExactPath(currentFilePath: string, importPath: string): string {
  const dir = path.posix.dirname(currentFilePath);
  return path.posix.normalize(path.posix.join(dir, importPath));
}

// Supabase REST API (via Cloudflare) rejects large payloads with 520.
// Keep batches small since each row includes full file content.
const INSERT_CHUNK_SIZE = 3;
const INSERT_MAX_RETRIES = 2;
const INSERT_RETRY_DELAY_MS = 1500;

function tryParseJson(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

type AdminClient = SupabaseClient;

/**
 * Normalize repo name to a URL-safe slug: lowercase, non-alphanumeric -> single hyphen, trim.
 * Matches migration backfill logic so new inserts and existing rows stay consistent.
 */
export function slugFromName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "repo";
}

/** Optional AI classifier: given path pairs, returns edge types in same order or null on failure. */
export type ClassifyEdgeTypesFn = (
  pairs: { sourcePath: string; targetPath: string }[]
) => Promise<("composition" | "data" | "utility")[] | null>;

/**
 * Runs the full DB write pipeline: insert repo, batch-insert files, parse imports, insert edges, update file_count.
 * On any failure after repo is created, deletes the repo and returns { error: 'db' }.
 * Returns { error: 'db', schemaMissing: true } when the table is missing (PGRST205) so the API can surface an actionable message.
 * If classifyEdgeTypes is provided and returns types, edges are stored with edge_type; otherwise graph route uses path-based inference.
 * Shared with T4 for git URL path.
 */
export async function runDbWritePipeline(
  admin: AdminClient,
  userId: string,
  repoName: string,
  files: RepoFileWithLanguage[],
  sourceType: "upload" | "git_url" = "upload",
  sourceUrl: string | null = null,
  classifyEdgeTypes?: ClassifyEdgeTypesFn
): Promise<{ repoId: string; slug: string } | { error: "db"; schemaMissing?: true }> {
  const baseSlug = slugFromName(repoName);
  let candidateSlug = baseSlug;
  let suffix = 2;
  while (true) {
    const { data: existing } = await admin
      .from("repositories")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", candidateSlug)
      .maybeSingle();
    if (!existing?.id) break;
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  const uniqueSlug = candidateSlug;

  const { data: repoRow, error: repoErr } = await admin
    .from("repositories")
    .insert({
      user_id: userId,
      name: repoName,
      slug: uniqueSlug,
      source_type: sourceType,
      source_url: sourceUrl,
      file_count: 0,
    })
    .select("id")
    .single();

  if (repoErr || !repoRow?.id) {
    const schemaMissing =
      repoErr?.code === "PGRST205" ||
      (typeof repoErr?.message === "string" && repoErr.message.includes("Could not find the table"));
    return { error: "db", ...(schemaMissing ? { schemaMissing: true as const } : {}) };
  }
  const repoId = repoRow.id as string;

  const cleanup = async () => {
    await admin.from("repositories").delete().eq("id", repoId);
  };

  // PostgreSQL text columns cannot store \u0000 (null byte).
  // Supabase REST API sends data as JSON, so null bytes cause
  // "unsupported Unicode escape sequence" errors.
  const sanitize = (s: string) => s.replace(/\0/g, "");

  const fileRows = files.map((f) => ({
    repo_id: repoId,
    path: f.path,
    content: sanitize(f.content),
    language: f.language,
  }));

  const insertedFiles: { id: string; path: string }[] = [];
  for (let i = 0; i < fileRows.length; i += INSERT_CHUNK_SIZE) {
    const chunk = fileRows.slice(i, i + INSERT_CHUNK_SIZE);
    let inserted: { id: string; path: string }[] | null = null;
    let lastError: typeof Error.prototype | null = null;

    for (let attempt = 0; attempt <= INSERT_MAX_RETRIES; attempt++) {
      const res = await admin
        .from("repo_files")
        .insert(chunk)
        .select("id, path");
      if (!res.error) {
        inserted = res.data;
        lastError = null;
        break;
      }
      lastError = res.error;
      if (attempt < INSERT_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, INSERT_RETRY_DELAY_MS * (attempt + 1)));
      }
    }

    if (lastError) {
      await cleanup();
      return { error: "db" };
    }
    insertedFiles.push(...(inserted ?? []));
  }

  const pathToFileId = new Map<string, string>();
  for (const row of insertedFiles) {
    pathToFileId.set(row.path, row.id);
  }

  // Detect stack profile for alias resolution and extension suffixes
  const packageJsonFile = files.find((f) => f.path.endsWith("package.json"));
  const parsedPkg = packageJsonFile ? tryParseJson(packageJsonFile.content) : null;
  const profile = detectStack(insertedFiles, parsedPkg);

  // Build alias roots from profile
  const aliasRoots = new Map<string, string>();
  for (const alias of profile.aliases ?? []) {
    const root = alias.resolveRoot(insertedFiles);
    aliasRoots.set(alias.prefix, root);
  }

  const extensionSuffixes = profile.extensionSuffixes;
  const edgeKey = (a: string, b: string) => `${a}\t${b}`;
  const seenEdges = new Set<string>();
  const edges: { repo_id: string; source_file_id: string; target_file_id: string }[] = [];
  const pathPairs: { sourcePath: string; targetPath: string }[] = [];
  for (const f of files) {
    const sourceId = pathToFileId.get(f.path);
    if (!sourceId) continue;
    const imports = parseImports(f.path, f.content);
    for (const imp of imports) {
      let resolvedPath: string | null = null;

      // Check alias prefixes first
      let aliasMatched = false;
      for (const entry of Array.from(aliasRoots.entries())) {
        const [prefix, root] = entry;
        if (imp.startsWith(prefix)) {
          resolvedPath = root + imp.slice(prefix.length);
          aliasMatched = true;
          break;
        }
      }

      if (!aliasMatched) {
        if (imp.startsWith("./") || imp.startsWith("../")) {
          // Relative path
          resolvedPath = resolveImportToExactPath(f.path, imp);
        } else {
          // Bare/absolute import (e.g. Python "myapp/models", HTML "scripts/app.js")
          // Try resolving against the file map directly
          resolvedPath = imp;
        }
      }

      if (!resolvedPath) continue;

      let targetId = pathToFileId.get(resolvedPath) ?? null;
      if (targetId === null) {
        for (const suffix of extensionSuffixes) {
          const candidate = resolvedPath + suffix;
          const id = pathToFileId.get(candidate);
          if (id != null) {
            targetId = id;
            break;
          }
        }
      }
      if (targetId && targetId !== sourceId) {
        const key = edgeKey(sourceId, targetId);
        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        edges.push({
          repo_id: repoId,
          source_file_id: sourceId,
          target_file_id: targetId,
        });
        pathPairs.push({ sourcePath: f.path, targetPath: resolvedPath });
      }
    }
  }

  let edgeTypes: ("composition" | "data" | "utility")[] | null = null;
  if (edges.length > 0 && classifyEdgeTypes) {
    const types = await classifyEdgeTypes(pathPairs);
    if (types !== null && types.length === edges.length) {
      edgeTypes = types;
    }
  }

  if (edges.length > 0) {
    const rows = edgeTypes
      ? edges.map((e, i) => ({ ...e, edge_type: edgeTypes![i] }))
      : edges;
    for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
      const { error } = await admin.from("graph_edges").insert(chunk);
      if (error) {
        await cleanup();
        return { error: "db" };
      }
    }
  }

  const { error: updateErr } = await admin
    .from("repositories")
    .update({ file_count: files.length })
    .eq("id", repoId);
  if (updateErr) {
    await cleanup();
    return { error: "db" };
  }

  return { repoId, slug: uniqueSlug };
}
