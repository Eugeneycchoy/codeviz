/**
 * Central registry of tech-stack profiles for multi-stack dependency graph support.
 * Each profile defines layer classification, import alias resolution, edge type
 * inference, and file extension handling for its ecosystem.
 */

export interface StackProfile {
  id: string;
  displayName: string;
  detect: {
    filePatterns?: string[];
    packageJsonDeps?: string[];
    packageJsonNotDeps?: string[];
  };
  layers: {
    name: string;
    emoji: string;
    subtitle: string;
    bg: string;
    match: (filePath: string) => boolean;
  }[];
  fallbackLayerIndex: number;
  extensionSuffixes: string[];
  aliases?: {
    prefix: string;
    resolveRoot: (files: { path: string }[]) => string;
  }[];
  inferEdgeType: (targetPath: string) => "composition" | "data" | "utility";
}

// ---------------------------------------------------------------------------
// Helper: find the directory containing a specific file
// ---------------------------------------------------------------------------
function dirContaining(files: { path: string }[], filename: string): string {
  for (const f of files) {
    if (f.path.endsWith(filename)) {
      const dir = f.path.slice(0, f.path.length - filename.length);
      return dir === "" ? "" : dir;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

const JS_TS_SUFFIXES = [
  ".ts", ".tsx", ".js", ".jsx",
  "/index.ts", "/index.tsx", "/index.js", "/index.jsx",
];

const nextjsProfile: StackProfile = {
  id: "nextjs",
  displayName: "Next.js",
  detect: { packageJsonDeps: ["next"] },
  layers: [
    {
      name: "PAGES",
      emoji: "\u{1F4C4}",
      subtitle: "Where users land \u2014 pages & layouts",
      bg: "#EEF2FF",
      match: (p) => {
        if (!p.replace(/\\/g, "/").startsWith("app/")) return false;
        if (p.replace(/\\/g, "/").startsWith("app/api/")) return false;
        return /\/(page|layout)\.(tsx|jsx|ts|js)$/.test(p);
      },
    },
    {
      name: "API ROUTES",
      emoji: "\u{1F50C}",
      subtitle: "Server endpoints that handle data",
      bg: "#ECFDF5",
      match: (p) => p.replace(/\\/g, "/").startsWith("app/api/"),
    },
    {
      name: "COMPONENTS",
      emoji: "\u{1F9E9}",
      subtitle: "Reusable UI building blocks",
      bg: "#FFF7ED",
      match: (p) => p.replace(/\\/g, "/").startsWith("components/"),
    },
    {
      name: "LIBRARY",
      emoji: "\u{1F4DA}",
      subtitle: "Shared utilities & core logic",
      bg: "#FDF2F8",
      match: (p) => p.replace(/\\/g, "/").startsWith("lib/"),
    },
    {
      name: "CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Project configuration files",
      bg: "#F5F3FF",
      match: () => true, // fallback
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
  inferEdgeType: (targetPath) => {
    const p = targetPath.replace(/\\/g, "/");
    if (p.startsWith("components/")) return "composition";
    if (p.startsWith("app/api/")) return "data";
    if (p.startsWith("lib/") || p.includes("utils")) return "utility";
    return "composition";
  },
};

const angularProfile: StackProfile = {
  id: "angular",
  displayName: "Angular",
  detect: {
    filePatterns: ["angular.json"],
    packageJsonDeps: ["@angular/core"],
  },
  layers: [
    {
      name: "PAGES/ROUTES",
      emoji: "\u{1F4C4}",
      subtitle: "Routed page components",
      bg: "#EEF2FF",
      match: (p) => /\.(page|routing)\.(ts|js)$/.test(p) || p.includes("/pages/"),
    },
    {
      name: "COMPONENTS",
      emoji: "\u{1F9E9}",
      subtitle: "Reusable UI components",
      bg: "#FFF7ED",
      match: (p) => p.includes(".component.") || p.replace(/\\/g, "/").startsWith("src/app/components/"),
    },
    {
      name: "SERVICES",
      emoji: "\u{1F50C}",
      subtitle: "Injectable services & data access",
      bg: "#ECFDF5",
      match: (p) => p.includes(".service.") || p.includes(".guard.") || p.includes(".interceptor."),
    },
    {
      name: "MODELS",
      emoji: "\u{1F4DA}",
      subtitle: "Interfaces, types & data models",
      bg: "#FDF2F8",
      match: (p) => p.includes(".model.") || p.includes(".interface.") || p.includes("/models/"),
    },
    {
      name: "CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Project configuration files",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
  inferEdgeType: (targetPath) => {
    if (targetPath.includes(".component.")) return "composition";
    if (targetPath.includes(".service.") || targetPath.includes(".guard.")) return "data";
    return "utility";
  },
};

const vueProfile: StackProfile = {
  id: "vue",
  displayName: "Vue",
  detect: { packageJsonDeps: ["vue"] },
  layers: [
    {
      name: "VIEWS",
      emoji: "\u{1F4C4}",
      subtitle: "Page-level view components",
      bg: "#EEF2FF",
      match: (p) => p.replace(/\\/g, "/").includes("/views/"),
    },
    {
      name: "COMPONENTS",
      emoji: "\u{1F9E9}",
      subtitle: "Reusable UI components",
      bg: "#FFF7ED",
      match: (p) => p.replace(/\\/g, "/").includes("/components/") || p.endsWith(".vue"),
    },
    {
      name: "COMPOSABLES",
      emoji: "\u{1F517}",
      subtitle: "Composition API hooks",
      bg: "#ECFDF5",
      match: (p) => p.replace(/\\/g, "/").includes("/composables/") || /\/use[A-Z]/.test(p),
    },
    {
      name: "STORE",
      emoji: "\u{1F4E6}",
      subtitle: "State management (Pinia/Vuex)",
      bg: "#FDF2F8",
      match: (p) => p.replace(/\\/g, "/").includes("/store/") || p.replace(/\\/g, "/").includes("/stores/"),
    },
    {
      name: "UTILS/CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Utilities & configuration",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: [...JS_TS_SUFFIXES, ".vue", "/index.vue"],
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => {
        const src = dirContaining(files, "src/main.ts") || dirContaining(files, "src/main.js");
        return src || dirContaining(files, "tsconfig.json");
      },
    },
  ],
  inferEdgeType: (targetPath) => {
    const p = targetPath.replace(/\\/g, "/");
    if (p.includes("/components/") || p.endsWith(".vue")) return "composition";
    if (p.includes("/store/") || p.includes("/stores/") || p.includes("/api/")) return "data";
    return "utility";
  },
};

const reactProfile: StackProfile = {
  id: "react",
  displayName: "React",
  detect: {
    packageJsonDeps: ["react"],
    packageJsonNotDeps: ["next"],
  },
  layers: [
    {
      name: "PAGES/SCREENS",
      emoji: "\u{1F4C4}",
      subtitle: "Top-level page components",
      bg: "#EEF2FF",
      match: (p) => {
        const n = p.replace(/\\/g, "/");
        return n.includes("/pages/") || n.includes("/screens/") || n.includes("/routes/");
      },
    },
    {
      name: "COMPONENTS",
      emoji: "\u{1F9E9}",
      subtitle: "Reusable UI components",
      bg: "#FFF7ED",
      match: (p) => p.replace(/\\/g, "/").includes("/components/"),
    },
    {
      name: "HOOKS",
      emoji: "\u{1F517}",
      subtitle: "Custom React hooks",
      bg: "#ECFDF5",
      match: (p) => p.replace(/\\/g, "/").includes("/hooks/") || /\/use[A-Z]/.test(p),
    },
    {
      name: "SERVICES/API",
      emoji: "\u{1F50C}",
      subtitle: "API clients & data services",
      bg: "#FDF2F8",
      match: (p) => {
        const n = p.replace(/\\/g, "/");
        return n.includes("/services/") || n.includes("/api/");
      },
    },
    {
      name: "UTILS/CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Utilities & configuration",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
  inferEdgeType: (targetPath) => {
    const p = targetPath.replace(/\\/g, "/");
    if (p.includes("/components/")) return "composition";
    if (p.includes("/api/") || p.includes("/services/")) return "data";
    return "utility";
  },
};

const djangoProfile: StackProfile = {
  id: "django",
  displayName: "Django",
  detect: { filePatterns: ["manage.py", "settings.py"] },
  layers: [
    {
      name: "VIEWS",
      emoji: "\u{1F4C4}",
      subtitle: "Request handlers & view logic",
      bg: "#EEF2FF",
      match: (p) => /\/views\.py$/.test(p) || p.replace(/\\/g, "/").includes("/views/"),
    },
    {
      name: "TEMPLATES",
      emoji: "\u{1F3A8}",
      subtitle: "HTML templates",
      bg: "#FFF7ED",
      match: (p) => p.replace(/\\/g, "/").includes("/templates/"),
    },
    {
      name: "MODELS",
      emoji: "\u{1F4DA}",
      subtitle: "Database models & migrations",
      bg: "#ECFDF5",
      match: (p) => /\/models\.py$/.test(p) || p.replace(/\\/g, "/").includes("/models/") || p.replace(/\\/g, "/").includes("/migrations/"),
    },
    {
      name: "FORMS/SERIALIZERS",
      emoji: "\u{1F4DD}",
      subtitle: "Forms, serializers & validation",
      bg: "#FDF2F8",
      match: (p) => /\/(forms|serializers)\.py$/.test(p) || p.replace(/\\/g, "/").includes("/forms/") || p.replace(/\\/g, "/").includes("/serializers/"),
    },
    {
      name: "UTILS/CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Utilities & configuration",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: [".py", "/__init__.py"],
  inferEdgeType: (targetPath) => {
    if (/\/views\.py$/.test(targetPath) || targetPath.includes("/views/")) return "composition";
    if (/\/models\.py$/.test(targetPath) || targetPath.includes("/models/")) return "data";
    return "utility";
  },
};

const expressProfile: StackProfile = {
  id: "express",
  displayName: "Express",
  detect: { packageJsonDeps: ["express"] },
  layers: [
    {
      name: "ROUTES",
      emoji: "\u{1F4C4}",
      subtitle: "HTTP route definitions",
      bg: "#EEF2FF",
      match: (p) => p.replace(/\\/g, "/").includes("/routes/"),
    },
    {
      name: "MIDDLEWARE",
      emoji: "\u{1F6E1}\uFE0F",
      subtitle: "Request/response middleware",
      bg: "#FFF7ED",
      match: (p) => p.replace(/\\/g, "/").includes("/middleware/") || p.includes(".middleware."),
    },
    {
      name: "CONTROLLERS",
      emoji: "\u{1F3AF}",
      subtitle: "Business logic handlers",
      bg: "#ECFDF5",
      match: (p) => p.replace(/\\/g, "/").includes("/controllers/") || p.includes(".controller."),
    },
    {
      name: "MODELS",
      emoji: "\u{1F4DA}",
      subtitle: "Data models & schemas",
      bg: "#FDF2F8",
      match: (p) => p.replace(/\\/g, "/").includes("/models/") || p.includes(".model."),
    },
    {
      name: "UTILS/CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Utilities & configuration",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
  inferEdgeType: (targetPath) => {
    const p = targetPath.replace(/\\/g, "/");
    if (p.includes("/controllers/") || p.includes(".controller.")) return "composition";
    if (p.includes("/models/") || p.includes(".model.")) return "data";
    return "utility";
  },
};

const staticHtmlProfile: StackProfile = {
  id: "static-html",
  displayName: "HTML/CSS/JS",
  detect: { filePatterns: ["index.html"] },
  layers: [
    {
      name: "HTML PAGES",
      emoji: "\u{1F4C4}",
      subtitle: "HTML page documents",
      bg: "#EEF2FF",
      match: (p) => /\.(html|htm)$/i.test(p),
    },
    {
      name: "SCRIPTS",
      emoji: "\u{1F4DC}",
      subtitle: "JavaScript files",
      bg: "#FFF7ED",
      match: (p) => /\.(js|ts)$/i.test(p),
    },
    {
      name: "STYLESHEETS",
      emoji: "\u{1F3A8}",
      subtitle: "CSS & style files",
      bg: "#ECFDF5",
      match: (p) => /\.(css|scss|sass|less)$/i.test(p),
    },
    {
      name: "ASSETS",
      emoji: "\u{1F5BC}\uFE0F",
      subtitle: "Images, fonts & media",
      bg: "#FDF2F8",
      match: (p) => /\.(json|xml|svg|txt|csv)$/i.test(p),
    },
    {
      name: "CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Project configuration files",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: [".js", ".css", ".html"],
  inferEdgeType: (targetPath) => {
    if (/\.(css|scss|sass|less)$/i.test(targetPath)) return "composition";
    if (/\.(json|xml|csv)$/i.test(targetPath)) return "data";
    return "utility";
  },
};

const genericProfile: StackProfile = {
  id: "generic",
  displayName: "Generic",
  detect: {},
  layers: [
    {
      name: "ENTRY POINTS",
      emoji: "\u{1F680}",
      subtitle: "Application entry points",
      bg: "#EEF2FF",
      match: (p) => {
        const base = p.split("/").pop() ?? "";
        return /^(main|index|app|server)\.(ts|js|tsx|jsx|py|go|rs|java|rb)$/.test(base);
      },
    },
    {
      name: "CORE",
      emoji: "\u{1F9E9}",
      subtitle: "Core application logic",
      bg: "#FFF7ED",
      match: (p) => {
        const n = p.replace(/\\/g, "/");
        return n.includes("/src/") || n.includes("/core/") || n.includes("/app/");
      },
    },
    {
      name: "LIBRARY",
      emoji: "\u{1F4DA}",
      subtitle: "Shared libraries & modules",
      bg: "#ECFDF5",
      match: (p) => {
        const n = p.replace(/\\/g, "/");
        return n.includes("/lib/") || n.includes("/pkg/") || n.includes("/internal/");
      },
    },
    {
      name: "UTILS",
      emoji: "\u{1F527}",
      subtitle: "Utility functions & helpers",
      bg: "#FDF2F8",
      match: (p) => {
        const n = p.replace(/\\/g, "/");
        return n.includes("/utils/") || n.includes("/helpers/") || n.includes("/common/");
      },
    },
    {
      name: "CONFIG",
      emoji: "\u2699\uFE0F",
      subtitle: "Project configuration files",
      bg: "#F5F3FF",
      match: () => true,
    },
  ],
  fallbackLayerIndex: 4,
  extensionSuffixes: [...JS_TS_SUFFIXES, ".py", "/__init__.py"],
  inferEdgeType: () => "utility",
};

// ---------------------------------------------------------------------------
// Detection — ordered by specificity (first match wins)
// ---------------------------------------------------------------------------

const PROFILES_BY_PRIORITY: StackProfile[] = [
  nextjsProfile,
  angularProfile,
  vueProfile,
  reactProfile,
  djangoProfile,
  expressProfile,
  staticHtmlProfile,
  genericProfile,
];

function hasDep(pkg: Record<string, unknown> | null, dep: string): boolean {
  if (!pkg) return false;
  const deps = pkg.dependencies as Record<string, string> | undefined;
  const devDeps = pkg.devDependencies as Record<string, string> | undefined;
  return !!(deps?.[dep] || devDeps?.[dep]);
}

export function detectStack(
  files: { path: string }[],
  packageJson?: Record<string, unknown> | null,
): StackProfile {
  const pathSet = new Set(files.map((f) => {
    const p = f.path.replace(/\\/g, "/");
    // Use just the filename for root-level checks
    return p;
  }));

  for (const profile of PROFILES_BY_PRIORITY) {
    const { detect } = profile;

    // Check packageJsonNotDeps first — if any are present, skip this profile
    if (detect.packageJsonNotDeps?.length) {
      if (detect.packageJsonNotDeps.some((d) => hasDep(packageJson ?? null, d))) {
        continue;
      }
    }

    // Check packageJsonDeps
    if (detect.packageJsonDeps?.length) {
      if (detect.packageJsonDeps.some((d) => hasDep(packageJson ?? null, d))) {
        return profile;
      }
    }

    // Check filePatterns
    if (detect.filePatterns?.length) {
      const matched = detect.filePatterns.some((pattern) =>
        Array.from(pathSet).some((p) => p.endsWith(pattern) || p.endsWith(`/${pattern}`))
      );
      if (matched) {
        // For static-html, only match if no framework deps detected
        if (profile.id === "static-html" && packageJson) {
          const hasFramework = ["next", "react", "vue", "@angular/core", "express"].some(
            (d) => hasDep(packageJson, d)
          );
          if (hasFramework) continue;
        }
        return profile;
      }
    }
  }

  return genericProfile;
}

/**
 * Classify a file path into a layer index using the given profile.
 * Iterates layers in order; the last layer should always be a catch-all.
 */
export function classifyLayerWithProfile(profile: StackProfile, filePath: string): number {
  const p = filePath.replace(/\\/g, "/");
  for (let i = 0; i < profile.layers.length; i++) {
    if (profile.layers[i].match(p)) return i;
  }
  return profile.fallbackLayerIndex;
}
