/**
 * Tech-stack profiles for import resolution during repo ingestion.
 * Each profile provides detection rules, import alias resolution, and
 * file extension suffixes for its ecosystem.
 */

export interface StackProfile {
  id: string;
  displayName: string;
  detect: {
    filePatterns?: string[];
    packageJsonDeps?: string[];
    packageJsonNotDeps?: string[];
  };
  extensionSuffixes: string[];
  aliases?: {
    prefix: string;
    resolveRoot: (files: { path: string }[]) => string;
  }[];
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
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
};

const angularProfile: StackProfile = {
  id: "angular",
  displayName: "Angular",
  detect: {
    filePatterns: ["angular.json"],
    packageJsonDeps: ["@angular/core"],
  },
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
};

const vueProfile: StackProfile = {
  id: "vue",
  displayName: "Vue",
  detect: { packageJsonDeps: ["vue"] },
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
};

const reactProfile: StackProfile = {
  id: "react",
  displayName: "React",
  detect: {
    packageJsonDeps: ["react"],
    packageJsonNotDeps: ["next"],
  },
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
};

const djangoProfile: StackProfile = {
  id: "django",
  displayName: "Django",
  detect: { filePatterns: ["manage.py", "settings.py"] },
  extensionSuffixes: [".py", "/__init__.py"],
};

const expressProfile: StackProfile = {
  id: "express",
  displayName: "Express",
  detect: { packageJsonDeps: ["express"] },
  extensionSuffixes: JS_TS_SUFFIXES,
  aliases: [
    {
      prefix: "@/",
      resolveRoot: (files) => dirContaining(files, "tsconfig.json"),
    },
  ],
};

const staticHtmlProfile: StackProfile = {
  id: "static-html",
  displayName: "HTML/CSS/JS",
  detect: { filePatterns: ["index.html"] },
  extensionSuffixes: [".js", ".css", ".html"],
};

const genericProfile: StackProfile = {
  id: "generic",
  displayName: "Generic",
  detect: {},
  extensionSuffixes: [...JS_TS_SUFFIXES, ".py", "/__init__.py"],
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
  const pathSet = new Set(files.map((f) => f.path.replace(/\\/g, "/")));

  for (const profile of PROFILES_BY_PRIORITY) {
    const { detect } = profile;

    if (detect.packageJsonNotDeps?.length) {
      if (detect.packageJsonNotDeps.some((d) => hasDep(packageJson ?? null, d))) {
        continue;
      }
    }

    if (detect.packageJsonDeps?.length) {
      if (detect.packageJsonDeps.some((d) => hasDep(packageJson ?? null, d))) {
        return profile;
      }
    }

    if (detect.filePatterns?.length) {
      const matched = detect.filePatterns.some((pattern) =>
        Array.from(pathSet).some((p) => p.endsWith(pattern) || p.endsWith(`/${pattern}`))
      );
      if (matched) {
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
