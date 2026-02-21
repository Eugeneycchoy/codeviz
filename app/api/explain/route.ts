import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const POE_BASE_URL = "https://api.poe.com/v1";
const POE_MODEL = "claude-sonnet-4";
const MAX_PROMPT_CONTENT_CHARS = 12_000;
const MAX_TOKENS = 1000;

/**
 * POST /api/explain
 * Body: { fileId }. Returns { explanation: string }. Cached from explanations table;
 * on cache miss, generates via Poe (OpenAI-compatible) and caches. Auth required.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { fileId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const fileId =
    typeof body.fileId === "string" ? body.fileId.trim() : "";
  if (!fileId) {
    return NextResponse.json(
      { error: "fileId is required" },
      { status: 400 }
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { data: fileRow, error: fileError } = await supabaseAdmin
    .from("repo_files")
    .select("repo_id, path, content")
    .eq("id", fileId)
    .single();
  if (fileError || !fileRow) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  const repoId = (fileRow as { repo_id: string }).repo_id;
  const path = (fileRow as { path: string | null }).path ?? "";
  const content = (fileRow as { content: string | null }).content ?? "";

  const { data: repoCheck, error: repoCheckError } = await supabaseAdmin
    .from("repositories")
    .select("user_id")
    .eq("id", repoId)
    .single();
  if (repoCheckError || !repoCheck) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if ((repoCheck as { user_id: string }).user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: explanationRow, error: explainError } = await supabaseAdmin
    .from("explanations")
    .select("content")
    .eq("file_id", fileId)
    .maybeSingle();
  if (explainError) {
    return NextResponse.json(
      { error: "Failed to load explanation" },
      { status: 500 }
    );
  }
  const cached =
    explanationRow && typeof (explanationRow as { content: string }).content === "string"
      ? (explanationRow as { content: string }).content
      : null;

  if (cached) {
    return NextResponse.json({ explanation: cached });
  }

  const apiKey = process.env.POE_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({
      explanation: "No explanation available.",
    });
  }

  const contentSlice =
    content.length > MAX_PROMPT_CONTENT_CHARS
      ? content.slice(0, MAX_PROMPT_CONTENT_CHARS) + "\n\n[Truncated for length.]"
      : content;
  const prompt = `Explain what this code file does in 2–4 sentences. Be concise and precise. Use beginner-friendly language: simple words, avoid unnecessary jargon, and briefly explain any technical terms so a newcomer can understand.\n\nFile: ${path}\n\nCode:\n${contentSlice}`;

  let generated: string;
  try {
    const res = await fetch(`${POE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: POE_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: MAX_TOKENS,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      if (process.env.NODE_ENV === "development") {
        console.warn("[explain] Poe API error:", res.status, errText);
      }
      return NextResponse.json({
        explanation: "No explanation available.",
      });
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({
        explanation: "No explanation available.",
      });
    }
    generated = text;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[explain] Poe request failed:", err);
    }
    return NextResponse.json({
      explanation: "No explanation available.",
    });
  }

  await supabaseAdmin
    .from("explanations")
    .upsert(
      { file_id: fileId, content: generated },
      { onConflict: "file_id" }
    );

  return NextResponse.json({ explanation: generated });
}
