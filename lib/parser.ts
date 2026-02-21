/**
 * Regex-based, language-agnostic import heuristics for building file-level dependency graph.
 * Input: file path + raw content. Output: list of resolved import targets (best-effort).
 * Supports JS/TS, Python, HTML, CSS, and Vue SFC.
 */

const JS_TS_EXTENSIONS = /\.(tsx?|jsx?)$/i;
const PY_EXTENSION = /\.py$/i;
const HTML_EXTENSION = /\.(html|htm)$/i;
const CSS_EXTENSION = /\.(css|scss|sass|less)$/i;
const VUE_EXTENSION = /\.vue$/i;

/** Captures relative or @/ path (group 1) in import/export from 'path' or "path". */
const ES_STATIC_OR_REEXPORT = /(?:import|export)\s+[\s\S]*?from\s+['"](\.\.?\/[^'"]*|@\/[^'"]*)['"]/g;
/** Captures relative or @/ path (group 1) in import('path'). */
const DYNAMIC_IMPORT = /import\s*\(\s*['"](\.\.?\/[^'"]*|@\/[^'"]*)['"]\s*\)/g;
/** Captures relative or @/ path (group 1) in require('path'). */
const COMMONJS_REQUIRE = /require\s*\(\s*['"](\.\.?\/[^'"]*|@\/[^'"]*)['"]\s*\)/g;

/** Python: from .module or ..module or . import / .. import. Group 1 = dots, group 2 = module name. */
const PY_FROM_RELATIVE = /from\s+(\.\.?)\s*(\w*)\s+import/g;
/** Python: from foo.bar import X — group 1 = dotted module path. */
const PY_FROM_ABSOLUTE = /from\s+(\w+(?:\.\w+)*)\s+import/g;
/** Python: import foo.bar — group 1 = dotted module path. */
const PY_IMPORT_ABSOLUTE = /^import\s+(\w+(?:\.\w+)*)/gm;

/** HTML: <script src="..."> — group 1 = src path. */
const HTML_SCRIPT_SRC = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
/** HTML: <link href="..."> for CSS — group 1 = href path. */
const HTML_LINK_HREF = /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi;

/** CSS: @import "path" or @import url("path") — group 1 or 2 = path. */
const CSS_IMPORT = /@import\s+(?:url\(\s*["']?([^"')]+)["']?\s*\)|["']([^"']+)["'])/gi;

function runAllRegex(
  content: string,
  regex: RegExp,
  getCapture: (match: RegExpExecArray) => string
): string[] {
  const out: string[] = [];
  const re = new RegExp(regex.source, regex.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    out.push(getCapture(m));
  }
  return out;
}

const EXTERNAL_URL = /^(https?:\/\/|\/\/)/i;

function isExternal(url: string): boolean {
  return EXTERNAL_URL.test(url.trim());
}

function parseJsTsImports(content: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const add = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  };
  runAllRegex(content, ES_STATIC_OR_REEXPORT, (m) => m[1]).forEach(add);
  runAllRegex(content, DYNAMIC_IMPORT, (m) => m[1]).forEach(add);
  runAllRegex(content, COMMONJS_REQUIRE, (m) => m[1]).forEach(add);
  return result;
}

function parsePythonImports(content: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const add = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  };

  // Relative imports: from . / from ..
  const reRel = new RegExp(PY_FROM_RELATIVE.source, PY_FROM_RELATIVE.flags);
  let m: RegExpExecArray | null;
  while ((m = reRel.exec(content)) !== null) {
    const dots = m[1];
    const mod = m[2] ?? "";
    const normalized = dots === "." ? `./${mod}` : `../${mod}`;
    add(normalized);
  }

  // Absolute imports: from foo.bar import X
  const reFromAbs = new RegExp(PY_FROM_ABSOLUTE.source, PY_FROM_ABSOLUTE.flags);
  while ((m = reFromAbs.exec(content)) !== null) {
    const dotted = m[1];
    // Skip stdlib-looking single-word imports (handled by resolver as "no match")
    add(dotted.replace(/\./g, "/"));
  }

  // Absolute imports: import foo.bar
  const reImpAbs = new RegExp(PY_IMPORT_ABSOLUTE.source, PY_IMPORT_ABSOLUTE.flags);
  while ((m = reImpAbs.exec(content)) !== null) {
    const dotted = m[1];
    add(dotted.replace(/\./g, "/"));
  }

  return result;
}

function parseHtmlImports(content: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const add = (p: string) => {
    if (!seen.has(p) && !isExternal(p)) {
      seen.add(p);
      result.push(p);
    }
  };

  runAllRegex(content, HTML_SCRIPT_SRC, (m) => m[1]).forEach(add);

  // Only pick up <link> tags that reference .css or .js files
  const reLink = new RegExp(HTML_LINK_HREF.source, HTML_LINK_HREF.flags);
  let m: RegExpExecArray | null;
  while ((m = reLink.exec(content)) !== null) {
    const href = m[1];
    if (/\.(css|js)$/i.test(href)) {
      add(href);
    }
  }

  return result;
}

function parseCssImports(content: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(CSS_IMPORT.source, CSS_IMPORT.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const p = m[1] || m[2];
    if (p && !isExternal(p) && !seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  }
  return result;
}

function parseVueImports(content: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const add = (p: string) => {
    if (!seen.has(p)) {
      seen.add(p);
      result.push(p);
    }
  };

  // Extract <script> block content and parse as JS/TS
  const scriptMatch = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(content);
  if (scriptMatch) {
    parseJsTsImports(scriptMatch[1]).forEach(add);
  }

  // Extract <style> block content and parse as CSS
  const styleMatch = /<style[^>]*>([\s\S]*?)<\/style>/i.exec(content);
  if (styleMatch) {
    parseCssImports(styleMatch[1]).forEach(add);
  }

  return result;
}

export function parseImports(filePath: string, content: string): string[] {
  try {
    if (JS_TS_EXTENSIONS.test(filePath)) return parseJsTsImports(content);
    if (PY_EXTENSION.test(filePath)) return parsePythonImports(content);
    if (HTML_EXTENSION.test(filePath)) return parseHtmlImports(content);
    if (CSS_EXTENSION.test(filePath)) return parseCssImports(content);
    if (VUE_EXTENSION.test(filePath)) return parseVueImports(content);
    return [];
  } catch {
    return [];
  }
}
