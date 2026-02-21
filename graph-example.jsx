import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

const LAYERS = [
  {
    name: "Interface",
    color: "#818CF8",
    icon: "🖥️",
    modules: [
      {
        name: "Pages",
        files: [
          { id: "pg-home", label: "Home" },
          { id: "pg-dash", label: "Dashboard" },
          { id: "pg-settings", label: "Settings" },
          { id: "pg-billing", label: "Billing" },
          { id: "pg-login", label: "Login" },
          { id: "pg-signup", label: "Signup" },
          { id: "pg-profile", label: "Profile" },
          { id: "pg-teams", label: "Teams" },
        ],
      },
      {
        name: "UI Components",
        files: [
          { id: "ui-btn", label: "Button" },
          { id: "ui-modal", label: "Modal" },
          { id: "ui-input", label: "Input" },
          { id: "ui-select", label: "Select" },
          { id: "ui-card", label: "Card" },
          { id: "ui-toast", label: "Toast" },
          { id: "ui-avatar", label: "Avatar" },
          { id: "ui-badge", label: "Badge" },
        ],
      },
      {
        name: "Layouts",
        files: [
          { id: "lay-root", label: "Root Layout" },
          { id: "lay-dash", label: "Dash Layout" },
          { id: "lay-auth", label: "Auth Layout" },
          { id: "lay-sidebar", label: "Sidebar" },
          { id: "lay-nav", label: "Navbar" },
        ],
      },
      {
        name: "Features",
        files: [
          { id: "ft-stats", label: "Stats Card" },
          { id: "ft-chart", label: "Chart" },
          { id: "ft-plans", label: "Plan Picker" },
          { id: "ft-teamlist", label: "Team List" },
          { id: "ft-activity", label: "Activity" },
          { id: "ft-uploads", label: "File Upload" },
        ],
      },
    ],
  },
  {
    name: "Services",
    color: "#34D399",
    icon: "⚙️",
    modules: [
      {
        name: "API Routes",
        files: [
          { id: "api-users", label: "Users" },
          { id: "api-teams", label: "Teams" },
          { id: "api-billing", label: "Billing" },
          { id: "api-analytics", label: "Analytics" },
          { id: "api-upload", label: "Upload" },
        ],
      },
      {
        name: "Auth",
        files: [
          { id: "auth-config", label: "Config" },
          { id: "auth-providers", label: "Providers" },
          { id: "auth-callbacks", label: "Callbacks" },
        ],
      },
      {
        name: "Actions",
        files: [
          { id: "act-profile", label: "Profile" },
          { id: "act-team", label: "Team" },
          { id: "act-sub", label: "Subscribe" },
        ],
      },
      {
        name: "Integrations",
        files: [
          { id: "int-stripe", label: "Stripe" },
          { id: "int-email", label: "Email" },
          { id: "int-s3", label: "S3" },
          { id: "int-posthog", label: "Posthog" },
        ],
      },
      {
        name: "Middleware",
        files: [
          { id: "mw-auth", label: "Auth Guard" },
          { id: "mw-rate", label: "Rate Limit" },
        ],
      },
    ],
  },
  {
    name: "Data",
    color: "#FBBF24",
    icon: "🗄️",
    modules: [
      {
        name: "Database",
        files: [
          { id: "db-client", label: "Client" },
          { id: "db-schema", label: "Schema" },
          { id: "db-migrate", label: "Migrations" },
          { id: "db-seed", label: "Seed" },
        ],
      },
      {
        name: "Queries",
        files: [
          { id: "q-users", label: "Users" },
          { id: "q-teams", label: "Teams" },
          { id: "q-subs", label: "Subscriptions" },
          { id: "q-analytics", label: "Analytics" },
          { id: "q-files", label: "Files" },
        ],
      },
      {
        name: "Cache",
        files: [
          { id: "cache-redis", label: "Redis" },
          { id: "cache-session", label: "Sessions" },
          { id: "cache-rate", label: "Rate Store" },
        ],
      },
    ],
  },
  {
    name: "Shared",
    color: "#A78BFA",
    icon: "🔗",
    modules: [
      {
        name: "Types",
        files: [
          { id: "t-user", label: "User" },
          { id: "t-team", label: "Team" },
          { id: "t-billing", label: "Billing" },
          { id: "t-api", label: "API" },
          { id: "t-analytics", label: "Analytics" },
        ],
      },
      {
        name: "Validations",
        files: [
          { id: "v-user", label: "User" },
          { id: "v-team", label: "Team" },
          { id: "v-billing", label: "Billing" },
        ],
      },
      {
        name: "Utils",
        files: [
          { id: "u-cn", label: "cn()" },
          { id: "u-format", label: "Formatters" },
          { id: "u-date", label: "Date" },
          { id: "u-crypto", label: "Crypto" },
        ],
      },
      {
        name: "Constants",
        files: [
          { id: "c-routes", label: "Routes" },
          { id: "c-plans", label: "Plans" },
          { id: "c-perms", label: "Permissions" },
        ],
      },
      {
        name: "Hooks",
        files: [
          { id: "h-user", label: "useUser" },
          { id: "h-team", label: "useTeam" },
          { id: "h-media", label: "useMedia" },
          { id: "h-toast", label: "useToast" },
        ],
      },
    ],
  },
  {
    name: "Platform",
    color: "#F472B6",
    icon: "🏗️",
    modules: [
      {
        name: "Config",
        files: [
          { id: "cfg-pkg", label: "package.json" },
          { id: "cfg-ts", label: "tsconfig" },
          { id: "cfg-next", label: "next.config" },
          { id: "cfg-eslint", label: "eslint" },
          { id: "cfg-env", label: ".env" },
        ],
      },
      {
        name: "CI/CD",
        files: [
          { id: "ci-test", label: "Test" },
          { id: "ci-build", label: "Build" },
          { id: "ci-deploy", label: "Deploy" },
          { id: "ci-docker", label: "Docker" },
        ],
      },
      {
        name: "Testing",
        files: [
          { id: "test-setup", label: "Setup" },
          { id: "test-fixtures", label: "Fixtures" },
          { id: "test-mocks", label: "Mocks" },
        ],
      },
    ],
  },
];

const EDGES = [
  { from: "pg-dash", to: "api-users" },
  { from: "pg-dash", to: "api-analytics" },
  { from: "pg-billing", to: "api-billing" },
  { from: "pg-teams", to: "api-teams" },
  { from: "pg-profile", to: "act-profile" },
  { from: "pg-settings", to: "act-profile" },
  { from: "pg-dash", to: "h-user" },
  { from: "pg-teams", to: "h-team" },
  { from: "pg-login", to: "auth-config" },
  { from: "pg-signup", to: "auth-config" },
  { from: "ft-stats", to: "h-user" },
  { from: "ft-plans", to: "c-plans" },
  { from: "ft-plans", to: "api-billing" },
  { from: "ft-teamlist", to: "h-team" },
  { from: "ft-chart", to: "api-analytics" },
  { from: "ft-uploads", to: "api-upload" },
  { from: "ui-btn", to: "u-cn" },
  { from: "ui-modal", to: "u-cn" },
  { from: "ui-input", to: "u-cn" },
  { from: "ui-toast", to: "h-toast" },
  { from: "lay-sidebar", to: "c-routes" },
  { from: "lay-nav", to: "h-user" },
  { from: "lay-dash", to: "mw-auth" },
  { from: "api-users", to: "q-users" },
  { from: "api-teams", to: "q-teams" },
  { from: "api-billing", to: "q-subs" },
  { from: "api-analytics", to: "q-analytics" },
  { from: "api-upload", to: "q-files" },
  { from: "api-users", to: "v-user" },
  { from: "api-teams", to: "v-team" },
  { from: "api-billing", to: "v-billing" },
  { from: "act-profile", to: "q-users" },
  { from: "act-team", to: "q-teams" },
  { from: "act-sub", to: "q-subs" },
  { from: "auth-config", to: "t-user" },
  { from: "auth-callbacks", to: "q-users" },
  { from: "int-stripe", to: "q-subs" },
  { from: "int-stripe", to: "t-billing" },
  { from: "int-email", to: "t-user" },
  { from: "mw-auth", to: "auth-config" },
  { from: "mw-rate", to: "cache-rate" },
  { from: "q-users", to: "db-client" },
  { from: "q-teams", to: "db-client" },
  { from: "q-subs", to: "db-client" },
  { from: "q-analytics", to: "db-client" },
  { from: "q-files", to: "db-client" },
  { from: "q-users", to: "t-user" },
  { from: "q-teams", to: "t-team" },
  { from: "q-subs", to: "t-billing" },
  { from: "q-analytics", to: "t-analytics" },
  { from: "cache-redis", to: "cfg-env" },
  { from: "db-client", to: "cfg-env" },
  { from: "h-user", to: "t-user" },
  { from: "h-team", to: "t-team" },
];

const CW = 860,
  PAD = 28,
  MOD_W = 148,
  MOD_G = 14,
  F_H = 26,
  MOD_H = 38,
  MOD_PB = 6,
  L_H = 22,
  L_G = 12;

const btnSt = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.04)",
  color: "#94A3B8",
  fontSize: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function ArchView() {
  const [expanded, setExpanded] = useState(
    () => new Set(["Interface/Pages", "Services/API Routes"]),
  );
  const [search, setSearch] = useState("");
  const [hovFile, setHovFile] = useState(null);
  const [selFile, setSelFile] = useState(null);

  const { fileMap, allModKeys } = useMemo(() => {
    const fm = {};
    const mk = [];
    LAYERS.forEach((l) =>
      l.modules.forEach((m) => {
        const k = `${l.name}/${m.name}`;
        mk.push(k);
        m.files.forEach((f) => {
          fm[f.id] = { ...f, modKey: k, layer: l, modName: m.name };
        });
      }),
    );
    return { fileMap: fm, allModKeys: mk };
  }, []);

  const layout = useMemo(() => {
    const avail = CW - 2 * PAD;
    const layers = [];
    let curY = 12;
    LAYERS.forEach((l) => {
      const lY = curY;
      curY += L_H + 8;
      const N = l.modules.length;
      const totalW = N * MOD_W + (N - 1) * MOD_G;
      const startX = PAD + (avail - totalW) / 2;
      let maxH = MOD_H;
      const mods = [];
      l.modules.forEach((m, i) => {
        const k = `${l.name}/${m.name}`;
        const isExp = expanded.has(k);
        const h = isExp ? MOD_H + m.files.length * F_H + MOD_PB : MOD_H;
        maxH = Math.max(maxH, h);
        const mx = startX + i * (MOD_W + MOD_G);
        const my = curY;
        const files = isExp
          ? m.files.map((f, fi) => ({
              id: f.id,
              label: f.label,
              cx: mx + MOD_W / 2,
              cy: my + MOD_H + fi * F_H + F_H / 2,
              localTop: MOD_H + fi * F_H,
            }))
          : [];
        mods.push({
          key: k,
          name: m.name,
          x: mx,
          y: my,
          w: MOD_W,
          h,
          isExp,
          files,
          fileCount: m.files.length,
          midX: mx + MOD_W / 2,
          midY: my + h / 2,
        });
      });
      curY += maxH + 16;
      layers.push({
        name: l.name,
        color: l.color,
        icon: l.icon,
        y: lY,
        h: curY - lY,
        mods,
      });
      curY += L_G;
    });
    return { layers, totalH: curY + 8 };
  }, [expanded]);

  const { filePos, modPos } = useMemo(() => {
    const fp = {},
      mp = {};
    layout.layers.forEach((l) =>
      l.mods.forEach((m) => {
        mp[m.key] = { cx: m.midX, cy: m.midY };
        m.files.forEach((f) => {
          fp[f.id] = { x: f.cx, y: f.cy };
        });
      }),
    );
    return { filePos: fp, modPos: mp };
  }, [layout]);

  const focal = selFile || hovFile;
  const { litEdges, litFiles } = useMemo(() => {
    if (!focal) return { litEdges: [], litFiles: new Set() };
    const es = EDGES.filter((e) => e.from === focal || e.to === focal);
    const fs = new Set([focal]);
    es.forEach((e) => {
      fs.add(e.from);
      fs.add(e.to);
    });
    return { litEdges: es, litFiles: fs };
  }, [focal]);
  const hasHL = litFiles.size > 0;
  const litMods = useMemo(() => {
    const s = new Set();
    litFiles.forEach((id) => {
      if (fileMap[id]) s.add(fileMap[id].modKey);
    });
    return s;
  }, [litFiles, fileMap]);

  const toggle = (k) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const results = search
    ? Object.values(fileMap)
        .filter(
          (f) =>
            f.label.toLowerCase().includes(search.toLowerCase()) ||
            f.modName.toLowerCase().includes(search.toLowerCase()),
        )
        .slice(0, 10)
    : [];

  return (
    <div
      onClick={() => setSelFile(null)}
      style={{
        minHeight: "100vh",
        background: "#0B0F1A",
        fontFamily: "Inter,-apple-system,sans-serif",
        color: "#E2E8F0",
      }}
    >
      <div style={{ maxWidth: CW, margin: "0 auto", padding: "16px 20px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#34D399",
                boxShadow: "0 0 8px #34D39966",
              }}
            />
            <span
              style={{
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              acme-saas
            </span>
            <span style={{ fontSize: 10, color: "#475569" }}>
              {Object.keys(fileMap).length} files · {allModKeys.length} modules
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setExpanded(new Set(allModKeys))}
              style={btnSt}
            >
              <Maximize2 size={11} /> Expand
            </button>
            <button onClick={() => setExpanded(new Set())} style={btnSt}>
              <Minimize2 size={11} /> Collapse
            </button>
          </div>
        </div>
        <div style={{ position: "relative", margin: "10px 0 6px" }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: 9, color: "#475569" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files or modules..."
            style={{
              width: "100%",
              padding: "7px 30px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              color: "#E2E8F0",
              fontSize: 11,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {search && (
            <X
              size={13}
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 10,
                top: 9,
                color: "#475569",
                cursor: "pointer",
              }}
            />
          )}
          {results.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: 36,
                left: 0,
                right: 0,
                zIndex: 200,
                background: "#1E293B",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                maxHeight: 200,
                overflowY: "auto",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {results.map((f) => (
                <div
                  key={f.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded((p) => new Set([...p, f.modKey]));
                    setSelFile(f.id);
                    setSearch("");
                  }}
                  style={{
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 10,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <span style={{ color: f.layer.color, fontWeight: 600 }}>
                    {f.label}
                  </span>
                  <span
                    style={{
                      color: "#475569",
                      fontSize: 8,
                      marginLeft: "auto",
                    }}
                  >
                    {f.modKey}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p style={{ fontSize: 9.5, color: "#334155", margin: 0 }}>
          Click modules to expand · Hover files to trace dependencies · Click to
          pin
        </p>
      </div>

      <div
        style={{
          maxWidth: CW,
          margin: "0 auto",
          position: "relative",
          height: layout.totalH,
        }}
      >
        <svg
          width={CW}
          height={layout.totalH}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <AnimatePresence>
            {focal &&
              litEdges.map((e, i) => {
                const fromFP = filePos[e.from];
                const toFP = filePos[e.to];
                const fromMP = modPos[fileMap[e.from]?.modKey];
                const toMP = modPos[fileMap[e.to]?.modKey];
                if (!fromMP || !toMP) return null;
                const sx = fromFP?.x ?? fromMP.cx,
                  sy = fromFP?.y ?? fromMP.cy;
                const ex = toFP?.x ?? toMP.cx,
                  ey = toFP?.y ?? toMP.cy;
                const dy = ey - sy;
                const cp = Math.max(40, Math.abs(dy) * 0.35);
                const sign = dy >= 0 ? 1 : -1;
                const col = fileMap[e.from]?.layer.color || "#666";
                const col2 = fileMap[e.to]?.layer.color || "#666";
                const d = `M${sx},${sy} C${sx},${sy + sign * cp} ${ex},${ey - sign * cp} ${ex},${ey}`;
                return (
                  <g key={`${e.from}-${e.to}`}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={col}
                      strokeWidth={5}
                      opacity={0.06}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={col}
                      strokeWidth={1.5}
                      opacity={0.65}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    <circle cx={sx} cy={sy} r={3} fill={col} opacity={0.8}>
                      <animate
                        attributeName="r"
                        values="2;3.5;2"
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle cx={ex} cy={ey} r={3} fill={col2} opacity={0.8}>
                      <animate
                        attributeName="r"
                        values="2;3.5;2"
                        dur="1.8s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                );
              })}
          </AnimatePresence>
        </svg>

        {layout.layers.map((layer) => (
          <div key={layer.name}>
            <div
              style={{
                position: "absolute",
                left: PAD,
                top: layer.y,
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 9,
                fontWeight: 700,
                color: layer.color,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                opacity: 0.5,
                zIndex: 2,
              }}
            >
              <span>{layer.icon}</span> {layer.name}
            </div>
            <div
              style={{
                position: "absolute",
                left: PAD - 8,
                right: PAD - 8,
                top: layer.y + L_H,
                height: layer.h - L_H - L_G,
                background: `${layer.color}05`,
                borderRadius: 12,
                border: `1px solid ${layer.color}08`,
                zIndex: 1,
              }}
            />

            {layer.mods.map((mod) => {
              const mDim = hasHL && !litMods.has(mod.key);
              const mLit = hasHL && litMods.has(mod.key);
              return (
                <div
                  key={mod.key}
                  style={{
                    position: "absolute",
                    left: mod.x,
                    top: mod.y,
                    width: mod.w,
                    height: mod.h,
                    zIndex: 3,
                  }}
                >
                  <div
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggle(mod.key);
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      background: mDim
                        ? "rgba(255,255,255,0.01)"
                        : mLit
                          ? `${layer.color}14`
                          : `${layer.color}09`,
                      border: `1px solid ${mLit ? layer.color + "44" : mDim ? "rgba(255,255,255,0.02)" : layer.color + "18"}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      opacity: mDim ? 0.3 : 1,
                      boxShadow: mLit ? `0 0 24px ${layer.color}12` : "none",
                    }}
                  />
                  <div
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggle(mod.key);
                    }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: MOD_H,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "0 10px",
                      cursor: "pointer",
                      opacity: mDim ? 0.35 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {mod.isExp ? (
                      <ChevronDown size={10} color={layer.color} />
                    ) : (
                      <ChevronRight size={10} color={layer.color} />
                    )}
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: layer.color,
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mod.name}
                    </span>
                    <span
                      style={{
                        fontSize: 7.5,
                        color: layer.color,
                        opacity: 0.6,
                        background: layer.color + "12",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {mod.fileCount}
                    </span>
                  </div>
                  {mod.isExp &&
                    mod.files.map((file) => {
                      const fLit = litFiles.has(file.id);
                      const fSel = selFile === file.id;
                      const fDim = hasHL && !litFiles.has(file.id);
                      return (
                        <div
                          key={file.id}
                          onMouseEnter={() => setHovFile(file.id)}
                          onMouseLeave={() => setHovFile(null)}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setSelFile(selFile === file.id ? null : file.id);
                          }}
                          style={{
                            position: "absolute",
                            left: 4,
                            top: file.localTop,
                            width: MOD_W - 8,
                            height: F_H - 2,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 8px",
                            fontSize: 9,
                            fontWeight: 600,
                            fontFamily: "'SF Mono',Monaco,Consolas,monospace",
                            borderRadius: 5,
                            cursor: "pointer",
                            background: fSel
                              ? layer.color + "2A"
                              : fLit
                                ? layer.color + "1A"
                                : "rgba(255,255,255,0.025)",
                            color: fDim
                              ? "#1E293B"
                              : fSel || fLit
                                ? "#F1F5F9"
                                : layer.color + "BB",
                            border: `1px solid ${fSel ? layer.color + "55" : fLit ? layer.color + "30" : "transparent"}`,
                            transition: "all 0.15s",
                            opacity: fDim ? 0.25 : 1,
                            zIndex: fSel || fLit ? 12 : 5,
                          }}
                        >
                          {file.label}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        ))}

        <AnimatePresence>
          {selFile &&
            (() => {
              const f = fileMap[selFile];
              if (!f) return null;
              const deps = EDGES.filter((e) => e.from === selFile)
                .map((e) => fileMap[e.to])
                .filter(Boolean);
              const refs = EDGES.filter((e) => e.to === selFile)
                .map((e) => fileMap[e.from])
                .filter(Boolean);
              return (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  onClick={(ev) => ev.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 220,
                    background: "#0F172AEE",
                    backdropFilter: "blur(16px)",
                    border: `1px solid ${f.layer.color}30`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    zIndex: 100,
                    boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: f.layer.color,
                      }}
                    />
                    <span
                      style={{ fontWeight: 700, fontSize: 12, color: "white" }}
                    >
                      {f.label}
                    </span>
                    <span
                      style={{
                        fontSize: 7,
                        color: f.layer.color,
                        fontWeight: 700,
                        background: f.layer.color + "18",
                        padding: "2px 6px",
                        borderRadius: 4,
                        marginLeft: "auto",
                      }}
                    >
                      {f.layer.name}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#64748B",
                      background: "rgba(255,255,255,0.04)",
                      padding: "5px 8px",
                      borderRadius: 6,
                      marginBottom: 10,
                      fontFamily: "monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    {f.modKey}
                  </div>
                  {deps.length > 0 && (
                    <div style={{ marginBottom: refs.length > 0 ? 10 : 0 }}>
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 5,
                        }}
                      >
                        → Imports ({deps.length})
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {deps.map((d) => (
                          <span
                            key={d.id}
                            onClick={() => {
                              setExpanded((p) => new Set([...p, d.modKey]));
                              setSelFile(d.id);
                            }}
                            style={{
                              padding: "2px 7px",
                              borderRadius: 5,
                              fontSize: 8,
                              fontWeight: 600,
                              background: d.layer.color + "15",
                              color: d.layer.color,
                              cursor: "pointer",
                              border: `1px solid ${d.layer.color}15`,
                            }}
                          >
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {refs.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          color: "#475569",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: 5,
                        }}
                      >
                        ← Used by ({refs.length})
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {refs.map((d) => (
                          <span
                            key={d.id}
                            onClick={() => {
                              setExpanded((p) => new Set([...p, d.modKey]));
                              setSelFile(d.id);
                            }}
                            style={{
                              padding: "2px 7px",
                              borderRadius: 5,
                              fontSize: 8,
                              fontWeight: 600,
                              background: d.layer.color + "15",
                              color: d.layer.color,
                              cursor: "pointer",
                              border: `1px solid ${d.layer.color}15`,
                            }}
                          >
                            {d.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })()}
        </AnimatePresence>
      </div>

      <div
        style={{
          maxWidth: CW,
          margin: "0 auto",
          padding: "8px 20px 32px",
          display: "flex",
          justifyContent: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        {LAYERS.map((l) => (
          <div
            key={l.name}
            style={{ display: "flex", alignItems: "center", gap: 5 }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: 3,
                background: l.color,
                opacity: 0.7,
              }}
            />
            <span style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>
              {l.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
