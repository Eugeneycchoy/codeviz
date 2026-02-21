/**
 * Single source of truth for the 5 fixed architecture layers.
 * Used by AI prompt, graph API, and frontend components.
 */

export interface FixedLayer {
  index: number;
  name: string;
  color: string;
  icon: string;
}

export const FIXED_LAYERS: FixedLayer[] = [
  { index: 0, name: "Interface", color: "#818CF8", icon: "\u{1F5A5}\uFE0F" },
  { index: 1, name: "Services",  color: "#34D399", icon: "\u2699\uFE0F" },
  { index: 2, name: "Data",      color: "#FBBF24", icon: "\u{1F5C4}\uFE0F" },
  { index: 3, name: "Shared",    color: "#A78BFA", icon: "\u{1F517}" },
  { index: 4, name: "Platform",  color: "#F472B6", icon: "\u{1F3D7}\uFE0F" },
];

/** Fallback heuristic: classify a file path into a layer index (0-4). */
export function classifyFileToLayer(filePath: string): number {
  const p = filePath.replace(/\\/g, "/").toLowerCase();

  // Interface (0): pages, components, layouts, views, templates, CSS/styles, providers, .vue/.html
  if (
    /\/(page|layout)\.(tsx|jsx|ts|js)$/.test(p) ||
    p.includes("/pages/") ||
    p.includes("/screens/") ||
    p.includes("/views/") ||
    p.includes("/components/") ||
    p.includes("/templates/") ||
    p.includes("/styles/") ||
    p.endsWith(".vue") ||
    p.endsWith(".html") ||
    p.endsWith(".htm") ||
    p.endsWith(".css") ||
    p.endsWith(".scss") ||
    p.endsWith(".sass") ||
    p.endsWith(".less") ||
    // Next.js app directory convention files
    /\/app\/layout\.(tsx|jsx|ts|js)$/.test(p) ||
    /\/app\/page\.(tsx|jsx|ts|js)$/.test(p) ||
    /\/app\/loading\.(tsx|jsx|ts|js)$/.test(p) ||
    /\/app\/error\.(tsx|jsx|ts|js)$/.test(p) ||
    /\/app\/global-error\.(tsx|jsx|ts|js)$/.test(p) ||
    /\/app\/not-found\.(tsx|jsx|ts|js)$/.test(p) ||
    /\/app\/providers\.(tsx|jsx|ts|js)$/.test(p)
  ) {
    return 0;
  }

  // Services (1): API routes, services, middleware, controllers, actions, auth
  if (
    p.includes("/api/") ||
    p.includes("/routes/") ||
    p.includes("/services/") ||
    p.includes("/middleware/") ||
    p.includes("/server/") ||
    p.includes("/controllers/") ||
    p.includes("/actions/") ||
    p.includes("/auth/") ||
    p.includes(".service.") ||
    p.includes(".controller.") ||
    p.includes(".middleware.") ||
    // Next.js root-level middleware
    /^middleware\.(ts|js)$/.test(p.split("/").pop() || "")
  ) {
    return 1;
  }

  // Data (2): database, models, queries, migrations, schemas, stores, cache
  if (
    p.includes("/models/") ||
    p.includes("/db/") ||
    p.includes("/database/") ||
    p.includes("/queries/") ||
    p.includes("/migrations/") ||
    p.includes("/schema") ||
    p.includes("/store/") ||
    p.includes("/stores/") ||
    p.includes("/cache/") ||
    p.includes("/prisma/") ||
    p.includes(".model.") ||
    /\/models\.py$/.test(p)
  ) {
    return 2;
  }

  // Shared (3): utils, helpers, hooks, types, constants, lib, common, validations, config files
  if (
    p.includes("/utils/") ||
    p.includes("/helpers/") ||
    p.includes("/hooks/") ||
    p.includes("/types/") ||
    p.includes("/constants/") ||
    p.includes("/lib/") ||
    p.includes("/common/") ||
    p.includes("/shared/") ||
    p.includes("/validations/") ||
    p.includes("/config/") ||
    /\/use[A-Z]/.test(filePath) ||
    // Config files
    /\.(config|rc)\.(ts|js|mjs|cjs|json)$/.test(p) ||
    /^tsconfig.*\.json$/.test(p.split("/").pop() || "") ||
    /^\.(eslintrc|prettierrc|babelrc)/.test(p.split("/").pop() || "")
  ) {
    return 3;
  }

  // Platform (4): CI/CD, Docker, env files, testing setup, build scripts, deployment config
  if (
    p.includes("/.github/") ||
    p.includes("/.gitlab-ci") ||
    p.includes("/docker") ||
    /^dockerfile/i.test(p.split("/").pop() || "") ||
    /^docker-compose/.test(p.split("/").pop() || "") ||
    /^makefile$/i.test(p.split("/").pop() || "") ||
    /^jenkinsfile$/i.test(p.split("/").pop() || "") ||
    /^\.env/.test(p.split("/").pop() || "") ||
    p.includes("/__tests__/") ||
    p.includes(".test.") ||
    p.includes(".spec.") ||
    /^(jest|vitest|cypress)\.config\.(ts|js|mjs)$/.test(p.split("/").pop() || "")
  ) {
    return 4;
  }

  // Default to Shared (3) instead of Platform (4) for unrecognized files
  return 3;
}

/** Fallback heuristic: derive a module name from the file's parent directory. */
export function classifyFileToModule(filePath: string): string {
  const p = filePath.replace(/\\/g, "/");
  const parts = p.split("/").filter(Boolean);
  const fileName = parts[parts.length - 1] || "";
  const lowerPath = p.toLowerCase();

  // Recognize common patterns and give descriptive names
  if (lowerPath.includes("/pages/") || /\/(page|layout)\.(tsx|jsx|ts|js)$/.test(lowerPath)) {
    return "Pages";
  }
  if (lowerPath.includes("/components/")) {
    return "Components";
  }
  if (lowerPath.includes("/styles/") || /\.(css|scss|sass|less)$/.test(lowerPath)) {
    return "Styles";
  }
  if (/\/app\/(layout|page|loading|error|not-found|providers)\.(tsx|jsx|ts|js)$/.test(lowerPath)) {
    return "App Layout";
  }
  if (lowerPath.includes("/api/")) {
    return "API Routes";
  }
  if (lowerPath.includes("/middleware/") || /^middleware\.(ts|js)$/.test(fileName.toLowerCase())) {
    return "Middleware";
  }
  if (lowerPath.includes("/auth/")) {
    return "Auth";
  }
  if (lowerPath.includes("/models/") || lowerPath.includes("/database/") || lowerPath.includes("/db/")) {
    return "Database";
  }
  if (lowerPath.includes("/migrations/")) {
    return "Migrations";
  }
  if (lowerPath.includes("/utils/") || lowerPath.includes("/helpers/")) {
    return "Utilities";
  }
  if (lowerPath.includes("/hooks/")) {
    return "Hooks";
  }
  if (lowerPath.includes("/types/")) {
    return "Types";
  }
  if (lowerPath.includes("/lib/")) {
    return "Library";
  }
  if (lowerPath.includes("/config/") || /\.(config|rc)\.(ts|js|mjs|cjs|json)$/.test(lowerPath)) {
    return "Config";
  }
  if (/^tsconfig.*\.json$/.test(fileName.toLowerCase()) || /^\.(eslintrc|prettierrc)/.test(fileName)) {
    return "Config";
  }
  if (lowerPath.includes("/.github/") || lowerPath.includes("/.gitlab-ci")) {
    return "CI/CD";
  }
  if (/^dockerfile/i.test(fileName) || /^docker-compose/.test(fileName)) {
    return "Docker";
  }
  if (/^\.env/.test(fileName)) {
    return "Environment";
  }
  if (lowerPath.includes("/__tests__/") || lowerPath.includes(".test.") || lowerPath.includes(".spec.")) {
    return "Tests";
  }

  // Fallback: use parent directory name, capitalized
  if (parts.length <= 1) {
    return "Root Config";
  }
  const parent = parts[parts.length - 2];
  return parent.charAt(0).toUpperCase() + parent.slice(1);
}
