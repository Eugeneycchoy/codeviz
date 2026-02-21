/**
 * AI-powered codebase analysis for file classification and stack detection.
 * Used at ingest time; result is stored on the repository and used by the graph route.
 */

export interface LayerMatchRule {
  path_prefixes: string[];
  path_contains: string[];
  path_suffixes: string[];
  is_catchall: boolean;
}

export interface FileClassificationRule {
  layer_index: number;
  module_name: string;
  match: LayerMatchRule;
}

export interface AnalysisResult {
  stack_id: string;
  extra_aliases: string[];
  file_classifications: FileClassificationRule[];
}

/** Fallback when AI analysis fails: one catch-all rule into Platform/Config. */
export function getDefaultAnalysisResult(): AnalysisResult {
  return {
    stack_id: "generic",
    extra_aliases: [],
    file_classifications: [
      {
        layer_index: 4,
        module_name: "Config",
        match: {
          path_prefixes: [],
          path_contains: [],
          path_suffixes: [],
          is_catchall: true,
        },
      },
    ],
  };
}

const POE_BASE_URL = "https://api.poe.com/v1";
const POE_MODEL = "claude-sonnet-4";
const MAX_TOKENS = 8192;

const SYSTEM_PROMPT = `You are a codebase analyst. Given a list of file paths and their contents (or path-only for large codebases), you must return a single JSON object with no markdown or extra text.

There are exactly 5 fixed architecture layers:
  0: Interface — UI pages, components, layouts, views, templates, CSS/styles, providers
  1: Services  — API routes, controllers, middleware, auth, integrations, server actions
  2: Data      — Database clients, models, queries, migrations, schemas, stores, cache
  3: Shared    — Types, utils, helpers, hooks, constants, validations, common code, project config files (tsconfig, eslint, tailwind, vite/webpack config, etc.)
  4: Platform  — CI/CD pipelines, Docker, env files, testing setup, build scripts, deployment config — strictly devops/infrastructure

Required shape:
{
  "stack_id": "string — e.g. nextjs, react-vite, django, rails",
  "extra_aliases": ["string — path prefixes that should resolve to a directory, e.g. @/ -> src/"],
  "file_classifications": [
    {
      "layer_index": 0,
      "module_name": "string — short human-readable group name within the layer, e.g. Pages, UI Components, API Routes, Database",
      "match": {
        "path_prefixes": ["string — paths that start with these"],
        "path_contains": ["string — paths that contain these substrings"],
        "path_suffixes": ["string — paths that end with these"],
        "is_catchall": false
      }
    }
  ]
}

Rules:
- layer_index must be 0, 1, 2, 3, or 4 (the 5 fixed layers above).
- module_name is a short descriptive name for a sub-group within a layer (e.g. "Pages", "UI Components", "Auth", "Queries").
- Multiple rules can share the same layer_index with different module_name values.
- The LAST rule MUST have "is_catchall": true (and no other rule may have it). It serves as the fallback for unmatched files.
- path_prefixes, path_contains, path_suffixes are arrays of strings; use empty arrays [] where not needed.
- Every file must match exactly one rule; the catch-all is the fallback.
- Rules are evaluated in order; first match wins.`;

export type EdgeType = "composition" | "data" | "utility";

const EDGE_TYPE_SYSTEM_PROMPT = `You classify codebase dependency edges into exactly one of three types. Given a list of edges (source file path → target file path), return a JSON array of strings with the same length and order. Each element must be exactly one of: "composition", "data", "utility".

Definitions:
- composition (Renders): The source file renders or embeds the target in the UI (e.g. importing a React component to display it, including a template or view). Parent-child UI structure.
- data (Data flow): The source fetches, passes, or depends on the target for data (e.g. API routes, state/store, services that provide data, database clients).
- utility (Utilities): The source uses the target as a helper, shared util, or pure logic (e.g. formatters, validators, constants, small helpers). No UI composition and not primary data flow.

Return only a JSON array of strings, no markdown or explanation. Example: ["composition","utility","data"]`;

const EDGE_TYPE_BATCH_SIZE = 40;
const EDGE_TYPE_MAX_TOKENS = 2048;
const RETRY_STATUSES = [502, 503, 504, 429];
const MAX_EDGE_TYPE_ATTEMPTS = 6;

function parseEdgeTypeArray(
  raw: string,
  expectedLength: number
): EdgeType[] | null {
  const trimmed = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      parsed = JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length !== expectedLength) return null;
  const valid: EdgeType[] = [];
  for (const item of parsed) {
    if (item === "composition" || item === "data" || item === "utility") {
      valid.push(item);
    } else {
      return null;
    }
  }
  return valid;
}

/**
 * Classifies each dependency edge as composition (Renders), data (Data flow), or utility (Utilities).
 * Batches requests to stay within token limits. Returns null on missing API key or API failure.
 */
export async function classifyEdgeTypes(
  edges: { sourcePath: string; targetPath: string }[]
): Promise<EdgeType[] | null> {
  const apiKey = process.env.POE_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) return null;
  if (edges.length === 0) return [];

  const results: EdgeType[] = [];
  for (let i = 0; i < edges.length; i += EDGE_TYPE_BATCH_SIZE) {
    const batch = edges.slice(i, i + EDGE_TYPE_BATCH_SIZE);
    const userMessage = batch
      .map((e, idx) => `${idx + 1}. ${e.sourcePath} → ${e.targetPath}`)
      .join("\n");
    let body: string;
    try {
      body = JSON.stringify({
        model: POE_MODEL,
        max_tokens: EDGE_TYPE_MAX_TOKENS,
        messages: [
          { role: "system", content: EDGE_TYPE_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      });
    } catch {
      return null;
    }

    let res: Response | null = null;
    for (let attempt = 1; attempt <= MAX_EDGE_TYPE_ATTEMPTS; attempt++) {
      try {
        res = await fetch(`${POE_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body,
        });
      } catch {
        if (attempt === MAX_EDGE_TYPE_ATTEMPTS) return null;
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      if (res.ok) break;
      if (attempt < MAX_EDGE_TYPE_ATTEMPTS && RETRY_STATUSES.includes(res.status)) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      return null;
    }
    if (!res?.ok) return null;
    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = await res.json();
    } catch {
      return null;
    }
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const batchTypes = parseEdgeTypeArray(content, batch.length);
    if (!batchTypes) return null;
    results.push(...batchTypes);
  }
  return results;
}

/** Config-like files whose content helps identify the stack (e.g. package.json, pyproject.toml). */
const STACK_HINT_PATTERNS = [
  "package.json",
  "tsconfig.json",
  "next.config",
  "vite.config",
  "pyproject.toml",
  "requirements.txt",
  "Gemfile",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
];

function isStackHintFile(path: string): boolean {
  const lower = path.toLowerCase();
  return STACK_HINT_PATTERNS.some((p) => lower.endsWith(p) || lower.includes(p));
}

function buildUserMessage(files: { path: string; content: string }[]): string {
  const parts: string[] = [];

  // Send content only for stack-hint config files (keeps payload small)
  const hintFiles = files.filter((f) => isStackHintFile(f.path));
  for (const f of hintFiles.slice(0, 5)) {
    const preview =
      f.content.length > 600 ? f.content.slice(0, 600) + "\n...[truncated]" : f.content;
    parts.push(`## ${f.path}\n${preview}`);
  }

  // For all other files, paths alone are sufficient for layer classification
  parts.push("## All file paths:");
  for (const f of files) {
    parts.push(f.path);
  }

  return parts.join("\n\n");
}

/** Try to extract a single JSON object from text (e.g. markdown or prose wrapping). */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return text;
  return text.slice(start, end + 1);
}

function parseAndValidate(raw: string): AnalysisResult | null {
  let parsed: unknown;
  let rawToParse = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  try {
    parsed = JSON.parse(rawToParse);
  } catch {
    rawToParse = extractJsonObject(rawToParse);
    try {
      parsed = JSON.parse(rawToParse);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const classifications = obj.file_classifications;
  if (!Array.isArray(classifications) || classifications.length === 0) return null;

  const stack_id = typeof obj.stack_id === "string" ? obj.stack_id : "";
  const extra_aliases = Array.isArray(obj.extra_aliases)
    ? obj.extra_aliases.filter((a): a is string => typeof a === "string")
    : [];

  const rules: FileClassificationRule[] = [];
  for (const entry of classifications) {
    if (typeof entry !== "object" || entry === null) return null;
    const e = entry as Record<string, unknown>;

    const layer_index = typeof e.layer_index === "number" ? e.layer_index : -1;
    if (layer_index < 0 || layer_index > 4 || !Number.isInteger(layer_index)) return null;

    const module_name = typeof e.module_name === "string" ? e.module_name : "";

    const match = e.match;
    if (typeof match !== "object" || match === null) return null;
    const m = match as Record<string, unknown>;
    const path_prefixes = Array.isArray(m.path_prefixes)
      ? m.path_prefixes.filter((p): p is string => typeof p === "string")
      : [];
    const path_contains = Array.isArray(m.path_contains)
      ? m.path_contains.filter((c): c is string => typeof c === "string")
      : [];
    const path_suffixes = Array.isArray(m.path_suffixes)
      ? m.path_suffixes.filter((s): s is string => typeof s === "string")
      : [];
    const is_catchall = m.is_catchall === true;

    // A non-catchall rule with all empty arrays would match everything — treat as catchall
    const hasNoConstraints = !is_catchall
      && path_prefixes.length === 0
      && path_contains.length === 0
      && path_suffixes.length === 0;

    rules.push({
      layer_index,
      module_name,
      match: {
        path_prefixes,
        path_contains,
        path_suffixes,
        is_catchall: is_catchall || hasNoConstraints,
      },
    });
  }

  // If no rule is marked catch-all, mark the last one.
  const hasCatchAll = rules.some((r) => r.match.is_catchall);
  if (!hasCatchAll && rules.length > 0) {
    rules[rules.length - 1].match.is_catchall = true;
  }

  return { stack_id, extra_aliases, file_classifications: rules };
}

/**
 * Runs AI analysis on the given files and returns file classifications + stack id + extra aliases.
 * Returns null if the API call fails or the response is invalid.
 */
export async function analyzeCodebase(
  files: { path: string; content: string }[]
): Promise<AnalysisResult | null> {
  const apiKey = process.env.POE_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    console.log("[analyzeCodebase] No POE_API_KEY configured, skipping AI analysis");
    return null;
  }

  console.log(`[analyzeCodebase] Starting AI analysis for ${files.length} files`);

  const userMessage = buildUserMessage(files);
  let body: string;
  try {
    body = JSON.stringify({
      model: POE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });
  } catch {
    console.log("[analyzeCodebase] Failed to serialize request body");
    return null;
  }

  const maxAttempts = 6;
  const retryStatuses = [502, 503, 504, 429];
  let res: Response | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(`${POE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body,
      });
    } catch (err) {
      console.log(`[analyzeCodebase] Fetch error (attempt ${attempt}/${maxAttempts}):`, err);
      if (attempt === maxAttempts) return null;
      await new Promise((r) => setTimeout(r, attempt * 2000));
      continue;
    }
    if (res.ok) break;
    console.log(`[analyzeCodebase] API returned status ${res.status} (attempt ${attempt}/${maxAttempts})`);
    if (attempt < maxAttempts && retryStatuses.includes(res.status)) {
      await new Promise((r) => setTimeout(r, attempt * 2000));
      continue;
    }
    return null;
  }
  if (!res || !res.ok) return null;

  console.log(`[analyzeCodebase] API response OK (status ${res.status})`);

  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = await res.json();
  } catch {
    console.log("[analyzeCodebase] Failed to parse API response JSON");
    return null;
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    console.log("[analyzeCodebase] No content in API response");
    return null;
  }
  const trimmed = content.trim().replace(/^```json\s*|\s*```$/g, "");
  const result = parseAndValidate(trimmed);
  if (result) {
    const nonCatchAll = result.file_classifications.filter((r) => !r.match.is_catchall).length;
    console.log(`[analyzeCodebase] Parsed ${result.file_classifications.length} rules (${nonCatchAll} non-catch-all), stack_id="${result.stack_id}"`);
  } else {
    console.log("[analyzeCodebase] parseAndValidate returned null — AI response could not be parsed");
  }
  return result;
}
