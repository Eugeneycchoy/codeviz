import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import JSZip from "jszip";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import {
  filterRepoFiles,
  detectLanguage,
  runDbWritePipeline,
  type RepoFile,
  type RepoFileWithLanguage,
} from "@/lib/repo-ingest";
import {
  analyzeCodebase,
  classifyEdgeTypes,
  getDefaultAnalysisResult,
} from "@/lib/codebase-analysis";

export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
/** Per-file uncompressed size limit (aligns with repo-ingest filter). */
const MAX_UNCOMPRESSED_FILE_BYTES = 500 * 1024; // 500 KB
/** Total uncompressed size limit to mitigate zip bombs. */
const MAX_TOTAL_UNCOMPRESSED_BYTES = 150 * 1024 * 1024; // 150 MB

/** Directory names to skip during git repo traversal (pruned before reading any file contents). */
const GIT_TRAVERSAL_SKIP_DIRS = new Set([".git", "node_modules", "dist", "build"]);

/**
 * POST /api/repo/ingest
 * Accept ZIP (multipart/form-data) or { gitUrl } JSON; returns { repoId }.
 * Auth required.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id && session?.user?.email && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          email: session.user.email,
          name: session.user.name ?? null,
          avatar_url: session.user.image ?? null,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();
    if (data?.id) session.user.id = data.id;
  }
  if (!session?.user?.id) {
    if (session?.user?.email && !supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            "Server configuration error: Supabase is required for user sync. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    let body: { gitUrl?: unknown; force?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    const gitUrl =
      typeof body.gitUrl === "string" ? body.gitUrl.trim() : "";
    const force =
      body.force === true ||
      (typeof body.force === "string" &&
        (body.force === "true" || body.force.toLowerCase() === "true"));

    if (
      !gitUrl ||
      (!gitUrl.startsWith("http://") && !gitUrl.startsWith("https://"))
    ) {
      return NextResponse.json(
        { error: "Invalid git URL" },
        { status: 400 }
      );
    }

    let urlObj: URL;
    try {
      urlObj = new URL(gitUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid git URL" },
        { status: 400 }
      );
    }
    const ALLOWED_GIT_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org"]);
    if (!ALLOWED_GIT_HOSTS.has(urlObj.hostname.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid git URL" },
        { status: 400 }
      );
    }
    const pathname = urlObj.pathname.replace(/\/$/, "");
    const lastSegment = pathname.split("/").pop() ?? "";
    const repoName = lastSegment.toLowerCase().endsWith(".git")
      ? lastSegment.slice(0, -4)
      : lastSegment;

    if (!repoName) {
      return NextResponse.json(
        { error: "Invalid git URL" },
        { status: 400 }
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("repositories")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("name", repoName)
      .eq("source_type", "git_url")
      .maybeSingle();

    if (existing?.id) {
      if (!force) {
        return NextResponse.json({ repoName }, { status: 409 });
      }
      const { error: delErr } = await supabaseAdmin
        .from("repositories")
        .delete()
        .eq("id", existing.id);
      if (delErr) {
        return NextResponse.json(
          { error: "Server error while replacing repository" },
          { status: 500 }
        );
      }
    }

    const dir = `/tmp/${crypto.randomUUID()}`;
    const prefix = dir + "/";
    const collectFilesFromDir = async (
      currentDir: string
    ): Promise<RepoFile[]> => {
      const acc: RepoFile[] = [];
      const entries = await fs.promises.readdir(currentDir, {
        withFileTypes: true,
      });
      for (const ent of entries) {
        const fullPath = `${currentDir}/${ent.name}`;
        if (ent.isDirectory()) {
          if (GIT_TRAVERSAL_SKIP_DIRS.has(ent.name)) continue;
          acc.push(...(await collectFilesFromDir(fullPath)));
        } else if (ent.isFile()) {
          const relativePath = fullPath.startsWith(prefix)
            ? fullPath.slice(prefix.length)
            : fullPath;
          try {
            const content = await fs.promises.readFile(fullPath, "utf-8");
            acc.push({ path: relativePath, content });
          } catch {
            // Skip files that can't be read as UTF-8
          }
        }
      }
      return acc;
    };

    let files: RepoFile[] = [];
    try {
      await git.clone({
        fs,
        http,
        dir,
        url: gitUrl,
        singleBranch: true,
      });
      files = await collectFilesFromDir(dir);
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not clone repository — check the URL and try again",
        },
        { status: 400 }
      );
    } finally {
      await fs.promises.rm(dir, { recursive: true, force: true });
    }

    let filtered: RepoFile[];
    try {
      filtered = filterRepoFiles(files, repoName);
    } catch (err) {
      if (err instanceof Error && err.message === "REPO_FILE_LIMIT") {
        return NextResponse.json(
          { error: "Repository exceeds 1 000 file limit" },
          { status: 400 }
        );
      }
      throw err;
    }

    const filesWithLanguage: RepoFileWithLanguage[] = filtered.map((f) => ({
      ...f,
      language: detectLanguage(f.path),
    }));

    let analysisResult = await analyzeCodebase(filesWithLanguage);
    if (!analysisResult) analysisResult = getDefaultAnalysisResult();

    const result = await runDbWritePipeline(
      supabaseAdmin,
      session.user.id,
      repoName,
      filesWithLanguage,
      "git_url",
      gitUrl,
      classifyEdgeTypes
    );

    if ("error" in result) {
      if (result.schemaMissing) {
        return NextResponse.json(
          {
            error:
              "Database schema not set up. Run the SQL in supabase/migrations/00000000000000_schema_stub.sql against your Supabase project (Dashboard → SQL Editor).",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Server error while saving repository" },
        { status: 500 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from("repositories")
      .update({
        layer_config: analysisResult.file_classifications,
        detected_stack_id: analysisResult.stack_id,
        analysis_extra_aliases: analysisResult.extra_aliases,
      })
      .eq("id", result.repoId);
    if (updateErr) {
      await supabaseAdmin.from("repositories").delete().eq("id", result.repoId);
      return NextResponse.json(
        { error: "Server error while saving repository" },
        { status: 500 }
      );
    }
    return NextResponse.json({ repoId: result.repoId, slug: result.slug }, { status: 200 });
  }

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Unsupported content type" },
      { status: 400 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing or invalid file field" },
      { status: 400 }
    );
  }

  const rawName = file.name;
  const baseName = path.basename(rawName);
  const nameWithoutExt = baseName.toLowerCase().endsWith(".zip")
    ? baseName.slice(0, -4)
    : baseName;
  const repoName = nameWithoutExt.replace(/[/\\\x00-\x1f\x7f]/g, "").trim();
  if (!repoName) {
    return NextResponse.json(
      { error: "Invalid or unsupported file name for repository" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 50 MB limit" },
      { status: 400 }
    );
  }

  const forceRaw = formData.get("force");
  const force =
    forceRaw === "true" || (typeof forceRaw === "string" && forceRaw.toLowerCase() === "true");

  const { data: existing } = await supabaseAdmin
    .from("repositories")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("name", repoName)
    .eq("source_type", "upload")
    .maybeSingle();

  if (existing?.id) {
    if (!force) {
      return NextResponse.json({ repoName }, { status: 409 });
    }
    const { error: delErr } = await supabaseAdmin
      .from("repositories")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      return NextResponse.json(
        { error: "Server error while replacing repository" },
        { status: 500 }
      );
    }
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 400 }
    );
  }

  const zip = await JSZip.loadAsync(buffer);
  type EntryWithSize = JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };
  const entries = Object.entries(zip.files) as [string, EntryWithSize][];
  let totalUncompressedBytes = 0;
  for (const [, entry] of entries) {
    if (entry.dir) continue;
    const uncompressedSize = entry._data?.uncompressedSize;
    if (typeof uncompressedSize !== "number" || uncompressedSize < 0) {
      return NextResponse.json(
        { error: "Invalid or unsupported ZIP (missing size metadata)" },
        { status: 400 }
      );
    }
    if (uncompressedSize > MAX_UNCOMPRESSED_FILE_BYTES) {
      return NextResponse.json(
        { error: "ZIP entry exceeds 500 KB per-file limit" },
        { status: 400 }
      );
    }
    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      return NextResponse.json(
        { error: "ZIP total uncompressed size exceeds 150 MB limit" },
        { status: 400 }
      );
    }
  }
  const extracted: RepoFile[] = [];
  for (const [, entry] of entries) {
    if (entry.dir) continue;
    const content = await entry.async("string");
    extracted.push({ path: entry.name, content });
  }

  let filtered: RepoFile[];
  try {
    filtered = filterRepoFiles(extracted, repoName);
  } catch (err) {
    if (err instanceof Error && err.message === "REPO_FILE_LIMIT") {
      return NextResponse.json(
        { error: "Repository exceeds 1 000 file limit" },
        { status: 400 }
      );
    }
    throw err;
  }

  const filesWithLanguage: RepoFileWithLanguage[] = filtered.map((f) => ({
    ...f,
    language: detectLanguage(f.path),
  }));

  let analysisResult = await analyzeCodebase(filesWithLanguage);
  if (!analysisResult) analysisResult = getDefaultAnalysisResult();

  const result = await runDbWritePipeline(
    supabaseAdmin,
    session.user.id,
    repoName,
    filesWithLanguage,
    "upload",
    null,
    classifyEdgeTypes
  );

  if ("error" in result) {
    if (result.schemaMissing) {
      return NextResponse.json(
        {
          error:
            "Database schema not set up. Run the SQL in supabase/migrations/00000000000000_schema_stub.sql against your Supabase project (Dashboard → SQL Editor).",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Server error while saving repository" },
      { status: 500 }
    );
  }

  const { error: updateErr } = await supabaseAdmin
    .from("repositories")
    .update({
      layer_config: analysisResult.file_classifications,
      detected_stack_id: analysisResult.stack_id,
      analysis_extra_aliases: analysisResult.extra_aliases,
    })
    .eq("id", result.repoId);
  if (updateErr) {
    await supabaseAdmin.from("repositories").delete().eq("id", result.repoId);
    return NextResponse.json(
      { error: "Server error while saving repository" },
      { status: 500 }
    );
  }
  return NextResponse.json({ repoId: result.repoId, slug: result.slug }, { status: 200 });
}
