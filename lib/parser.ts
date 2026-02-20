/**
 * Regex-based, language-agnostic import heuristics for building file-level dependency graph.
 * Input: file path + raw content. Output: list of resolved import targets (best-effort).
 * Supports JS/TS (relative ES static, re-export, dynamic import, require) and Python (from . / ..).
 */

const JS_TS_EXTENSIONS = /\.(tsx?|jsx?)$/i;
const PY_EXTENSION = /\.py$/i;

/** Captures relative path (group 1) in import/export from 'path' or "path". */
const ES_STATIC_OR_REEXPORT = /(?:import|export)\s+[\s\S]*?from\s+['"](\.\.?\/[^'"]*)['"]/g;
/** Captures relative path (group 1) in import('path'). */
const DYNAMIC_IMPORT = /import\s*\(\s*['"](\.\.?\/[^'"]*)['"]\s*\)/g;
/** Captures relative path (group 1) in require('path'). */
const COMMONJS_REQUIRE = /require\s*\(\s*['"](\.\.?\/[^'"]*)['"]\s*\)/g;

/** Python: from .module or ..module or . import / .. import. Group 1 = dots, group 2 = module name. */
const PY_FROM_RELATIVE = /from\s+(\.\.?)\s*(\w*)\s+import/g;

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

export function parseImports(filePath: string, content: string): string[] {
  try {
    if (JS_TS_EXTENSIONS.test(filePath)) {
      const seen = new Set<string>();
      const add = (p: string) => {
        if (!seen.has(p)) {
          seen.add(p);
          result.push(p);
        }
      };
      const result: string[] = [];
      runAllRegex(content, ES_STATIC_OR_REEXPORT, (m) => m[1]).forEach(add);
      runAllRegex(content, DYNAMIC_IMPORT, (m) => m[1]).forEach(add);
      runAllRegex(content, COMMONJS_REQUIRE, (m) => m[1]).forEach(add);
      return result;
    }
    if (PY_EXTENSION.test(filePath)) {
      const result: string[] = [];
      let m: RegExpExecArray | null;
      const re = new RegExp(PY_FROM_RELATIVE.source, PY_FROM_RELATIVE.flags);
      while ((m = re.exec(content)) !== null) {
        const dots = m[1];
        const mod = m[2] ?? '';
        const normalized = dots === '.' ? `./${mod}` : `../${mod}`;
        result.push(normalized);
      }
      return result;
    }
    return [];
  } catch {
    return [];
  }
}
