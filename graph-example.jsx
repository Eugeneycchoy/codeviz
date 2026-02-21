import { useState, useMemo } from "react";

const NODE_W = 155;
const NODE_H = 56;
const SVG_W = 1020;
const SVG_H = 480;

const ROLE = {
  entry: { color: "#6366F1", label: "Entry" },
  hub: { color: "#D97706", label: "Hub" },
  shared: { color: "#0891B2", label: "Shared" },
  leaf: { color: "#9CA3AF", label: "Leaf" },
};

const ETYPE = {
  composition: { color: "#818CF8", dash: "", label: "Renders" },
  data: { color: "#34D399", dash: "6,3", label: "Data flow" },
  utility: { color: "#F59E0B", dash: "3,3", label: "Utility" },
};

const LAYERS = [
  {
    id: "entry",
    y: 8,
    h: 108,
    bg: "#EEF2FF",
    title: "📄 Entry Points",
    sub: "Where users land — pages & layouts",
  },
  {
    id: "api",
    y: 128,
    h: 108,
    bg: "#ECFDF5",
    title: "🔌 API Routes",
    sub: "Server endpoints that handle data",
  },
  {
    id: "components",
    y: 248,
    h: 108,
    bg: "#FFF7ED",
    title: "🧩 Components",
    sub: "Reusable UI building blocks",
  },
  {
    id: "lib",
    y: 368,
    h: 108,
    bg: "#FDF2F8",
    title: "📚 Library",
    sub: "Shared utilities & core logic",
  },
];
const LM = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

const NODES = [
  {
    id: "layout",
    name: "layout.tsx",
    path: "app/",
    layer: "entry",
    role: "entry",
    deps: 8,
    x: 100,
  },
  {
    id: "login",
    name: "page.tsx",
    path: "app/(auth)/login/",
    layer: "entry",
    role: "entry",
    deps: 0,
    x: 420,
  },
  {
    id: "dashboard",
    name: "page.tsx",
    path: "app/dashboard/",
    layer: "entry",
    role: "entry",
    deps: 0,
    x: 730,
  },
  {
    id: "api-explain",
    name: "route.ts",
    path: "api/explain/",
    layer: "api",
    role: "shared",
    deps: 1,
    x: 100,
  },
  {
    id: "api-repo",
    name: "route.ts",
    path: "api/repo/",
    layer: "api",
    role: "shared",
    deps: 2,
    x: 420,
  },
  {
    id: "api-auth",
    name: "route.ts",
    path: "api/auth/",
    layer: "api",
    role: "shared",
    deps: 1,
    x: 730,
  },
  {
    id: "navbar",
    name: "Navbar.tsx",
    path: "components/",
    layer: "components",
    role: "hub",
    deps: 3,
    x: 60,
  },
  {
    id: "session",
    name: "SessionProvider.tsx",
    path: "components/",
    layer: "components",
    role: "hub",
    deps: 2,
    x: 260,
  },
  {
    id: "repo-card",
    name: "RepoCard.tsx",
    path: "components/",
    layer: "components",
    role: "shared",
    deps: 2,
    x: 520,
  },
  {
    id: "code-viewer",
    name: "CodeViewer.tsx",
    path: "components/",
    layer: "components",
    role: "leaf",
    deps: 1,
    x: 780,
  },
  {
    id: "auth",
    name: "auth.ts",
    path: "lib/",
    layer: "lib",
    role: "hub",
    deps: 6,
    x: 100,
  },
  {
    id: "supabase",
    name: "supabase.ts",
    path: "lib/",
    layer: "lib",
    role: "hub",
    deps: 5,
    x: 350,
  },
  {
    id: "parser",
    name: "parser.ts",
    path: "lib/",
    layer: "lib",
    role: "leaf",
    deps: 2,
    x: 590,
  },
  {
    id: "utils",
    name: "utils.ts",
    path: "lib/",
    layer: "lib",
    role: "leaf",
    deps: 7,
    x: 830,
  },
];
const NM = Object.fromEntries(NODES.map((n) => [n.id, n]));

const EDGES = [
  { from: "layout", to: "navbar", type: "composition", label: "Navbar" },
  {
    from: "layout",
    to: "session",
    type: "composition",
    label: "SessionProvider",
  },
  {
    from: "dashboard",
    to: "repo-card",
    type: "composition",
    label: "RepoCard",
  },
  { from: "dashboard", to: "api-repo", type: "data", label: "fetch repos" },
  { from: "login", to: "api-auth", type: "data", label: "signIn()" },
  { from: "navbar", to: "auth", type: "utility", label: "useSession()" },
  { from: "session", to: "auth", type: "utility", label: "SessionProvider" },
  {
    from: "repo-card",
    to: "code-viewer",
    type: "composition",
    label: "CodeViewer",
  },
  { from: "code-viewer", to: "parser", type: "utility", label: "parseCode()" },
  { from: "api-explain", to: "parser", type: "utility", label: "parseCode()" },
  {
    from: "api-explain",
    to: "auth",
    type: "utility",
    label: "validateToken()",
  },
  { from: "api-repo", to: "supabase", type: "data", label: "query repos" },
  { from: "api-auth", to: "auth", type: "utility", label: "authOptions" },
  { from: "api-auth", to: "supabase", type: "data", label: "query users" },
  { from: "auth", to: "supabase", type: "data", label: "createClient()" },
  { from: "navbar", to: "utils", type: "utility", label: "cn()" },
  { from: "repo-card", to: "utils", type: "utility", label: "formatDate()" },
  { from: "parser", to: "utils", type: "utility", label: "slugify()" },
];

const EXPLAIN = {
  layout: {
    sum: "Root layout wrapping all pages. Provides global nav and auth session context to the entire application.",
    exp: ["RootLayout (default)"],
    tip: "💡 Start here — every page renders inside this layout. It's the outermost shell of your app.",
    impact: "High — changes affect every page",
  },
  login: {
    sum: "Login page with email/password and GitHub OAuth. Redirects to the dashboard on successful authentication.",
    exp: ["LoginPage (default)"],
    tip: "💡 First page unauthenticated users see. Simple form delegating auth to the API.",
    impact: "Low — only affects login view",
  },
  dashboard: {
    sum: "Main dashboard showing repos as interactive cards. Fetches the repo list from the API on mount.",
    exp: ["DashboardPage (default)"],
    tip: "💡 Primary page after login. Great for tracing data flow from UI → API → DB.",
    impact: "Medium — main dashboard view",
  },
  "api-explain": {
    sum: "POST endpoint accepting code and returning AI explanations. Validates auth, parses code, calls the LLM.",
    exp: ["POST handler"],
    tip: "💡 Core AI feature endpoint. Trace dependencies to understand the explain pipeline.",
    impact: "Medium — core feature",
  },
  "api-repo": {
    sum: "CRUD API for repositories. Handles listing, creating, and deleting tracked repos in Supabase.",
    exp: ["GET, POST, DELETE"],
    tip: "💡 All repository data flows through here.",
    impact: "Medium — repo operations",
  },
  "api-auth": {
    sum: "NextAuth catch-all route handling OAuth callbacks, session management, and JWT operations.",
    exp: ["GET, POST (NextAuth)"],
    tip: "💡 Handles login, logout, and session refresh. Configured via authOptions.",
    impact: "High — auth infrastructure",
  },
  navbar: {
    sum: "Top navigation bar with logo, links, and session-aware user avatar. Shows login button or user menu.",
    exp: ["Navbar (default)"],
    tip: "💡 Hub component on every page. Good entry point for understanding the UI.",
    impact: "Medium — visible everywhere",
  },
  session: {
    sum: "Client wrapper providing NextAuth session context to all child components in the tree.",
    exp: ["SessionProviderWrapper"],
    tip: "💡 Required for any component using useSession(). Wraps entire app.",
    impact: "High — removing breaks auth UI",
  },
  "repo-card": {
    sum: "Card component showing repo info: name, language, last analyzed timestamp. Expandable for code view.",
    exp: ["RepoCard (default)"],
    tip: "💡 Used in the dashboard grid. Click connections to trace composition.",
    impact: "Low — repo display only",
  },
  "code-viewer": {
    sum: "Syntax-highlighted code display with line numbers, copy button, and language detection.",
    exp: ["CodeViewer (default)"],
    tip: "💡 Leaf component — nothing depends on it. Safe to modify in isolation.",
    impact: "Low — contained leaf",
  },
  auth: {
    sum: "Core auth module. Configures NextAuth providers, JWT handling, exports session utilities used across the app.",
    exp: ["authOptions", "validateToken()", "useSession()", "SessionProvider"],
    tip: "🔑 HUB file — 6 files depend on this. Wide blast radius. Modify with caution.",
    impact: "High — foundational auth",
  },
  supabase: {
    sum: "Supabase client setup and typed database connection. Single source of truth for all DB access.",
    exp: ["createClient()", "db", "Database (type)"],
    tip: "🔑 Deepest dependency. Every data operation ultimately flows through here.",
    impact: "High — database foundation",
  },
  parser: {
    sum: "Code parsing utilities: tokenizer, AST extraction, formatting. Pure functions with no side effects.",
    exp: ["parseCode()", "tokenize()", "extractExports()"],
    tip: "💡 Pure utility module. Easy to test. Core of the explain feature.",
    impact: "Medium — affects explain",
  },
  utils: {
    sum: "General helpers: className merger (cn), date formatting, slugification, debounce.",
    exp: ["cn()", "formatDate()", "slugify()", "debounce()"],
    tip: "💡 Most-imported file (7 deps) but each function is independent and low-risk.",
    impact: "Low per fn — widely used",
  },
};

function nodeRect(n) {
  const l = LM[n.layer];
  const ny = l.y + l.h - NODE_H - 8;
  return {
    x: n.x,
    y: ny,
    cx: n.x + NODE_W / 2,
    cy: ny + NODE_H / 2,
    b: ny + NODE_H,
    t: ny,
  };
}

function edgePath(e) {
  const s = nodeRect(NM[e.from]);
  const t = nodeRect(NM[e.to]);
  if (NM[e.from].layer === NM[e.to].layer) {
    const left = s.cx < t.cx;
    const sx = left ? s.x + NODE_W : s.x;
    const tx = left ? t.x : t.x + NODE_W;
    const my = Math.max(s.cy, t.cy) + 25;
    return (
      "M " +
      sx +
      " " +
      s.cy +
      " Q " +
      (sx + tx) / 2 +
      " " +
      my +
      ", " +
      tx +
      " " +
      t.cy
    );
  }
  const dy = t.t - s.b;
  return (
    "M " +
    s.cx +
    " " +
    s.b +
    " C " +
    s.cx +
    " " +
    (s.b + dy * 0.45) +
    ", " +
    t.cx +
    " " +
    (t.t - dy * 0.45) +
    ", " +
    t.cx +
    " " +
    t.t
  );
}

function edgeMid(e) {
  const s = nodeRect(NM[e.from]);
  const t = nodeRect(NM[e.to]);
  if (NM[e.from].layer === NM[e.to].layer) {
    const left = s.cx < t.cx;
    const sx = left ? s.x + NODE_W : s.x;
    const tx = left ? t.x : t.x + NODE_W;
    return { x: (sx + tx) / 2, y: Math.max(s.cy, t.cy) + 16 };
  }
  return { x: (s.cx + t.cx) / 2, y: (s.b + t.t) / 2 };
}

function getConnected(id) {
  const s = new Set();
  EDGES.forEach(function (e) {
    if (e.from === id) s.add(e.to);
    if (e.to === id) s.add(e.from);
  });
  return s;
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h3
        style={{
          margin: "0 0 5px",
          fontSize: 10,
          fontWeight: 600,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function App() {
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);
  const [filter, setFilter] = useState("all");

  const active = hov || sel;
  const conn = useMemo(
    function () {
      return active ? getConnected(active) : new Set();
    },
    [active],
  );
  const nodeOk = function (id) {
    return !active || id === active || conn.has(id);
  };
  const edgeHi = function (e) {
    return !active || e.from === active || e.to === active;
  };
  const edgeVis = function (e) {
    return filter === "all" || e.type === filter;
  };

  const selN = sel ? NM[sel] : null;
  const selE = sel ? EXPLAIN[sel] : null;
  const selEdges = useMemo(
    function () {
      return sel
        ? EDGES.filter(function (e) {
            return e.from === sel || e.to === sel;
          })
        : [];
    },
    [sel],
  );

  const layoutR = nodeRect(NM["layout"]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily:
          "Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
        background: "#F8FAFC",
        color: "#1E293B",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid #E2E8F0",
            background: "white",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
                color: "white",
                fontWeight: 800,
                fontSize: 13,
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              CV
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>CodeViz</span>
            <span style={{ color: "#CBD5E1" }}>/</span>
            <span style={{ color: "#64748B", fontSize: 13 }}>
              Dependency Graph
            </span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {["all", "composition", "data", "utility"].map(function (f) {
              return (
                <button
                  key={f}
                  onClick={function () {
                    setFilter(f);
                  }}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    border: filter === f ? "none" : "1px solid #E2E8F0",
                    background:
                      filter === f
                        ? f === "all"
                          ? "#334155"
                          : ETYPE[f].color
                        : "white",
                    color: filter === f ? "white" : "#64748B",
                    fontSize: 11,
                    fontWeight: filter === f ? 600 : 400,
                    cursor: "pointer",
                  }}
                >
                  {f === "all" ? "All connections" : ETYPE[f].label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, padding: 8, overflow: "auto" }}>
          <svg
            viewBox={"0 0 " + SVG_W + " " + SVG_H}
            style={{ width: "100%", height: "100%" }}
            onClick={function () {
              setSel(null);
            }}
          >
            <defs>
              <filter id="sh" x="-4%" y="-4%" width="108%" height="116%">
                <feDropShadow
                  dx="0"
                  dy="1"
                  stdDeviation="2"
                  floodColor="#000"
                  floodOpacity=".06"
                />
              </filter>
              {Object.entries(ETYPE).map(function (entry) {
                var k = entry[0];
                var v = entry[1];
                return (
                  <marker
                    key={k}
                    id={"a-" + k}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M0 0L10 5L0 10z" fill={v.color} />
                  </marker>
                );
              })}
            </defs>

            {LAYERS.map(function (l) {
              return (
                <g key={l.id}>
                  <rect
                    x={4}
                    y={l.y}
                    width={SVG_W - 8}
                    height={l.h}
                    rx={10}
                    fill={l.bg}
                    opacity={0.55}
                  />
                  <text
                    x={18}
                    y={l.y + 20}
                    fontSize={12}
                    fontWeight={700}
                    fill="#374151"
                    style={{ pointerEvents: "none" }}
                  >
                    {l.title}
                  </text>
                  <text
                    x={18}
                    y={l.y + 34}
                    fontSize={9}
                    fill="#9CA3AF"
                    style={{ pointerEvents: "none" }}
                  >
                    {l.sub}
                  </text>
                </g>
              );
            })}

            {!active && (
              <g style={{ pointerEvents: "none" }}>
                <rect
                  x={48}
                  y={layoutR.cy - 10}
                  width={40}
                  height={20}
                  rx={4}
                  fill="#6366F1"
                >
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </rect>
                <text
                  x={68}
                  y={layoutR.cy + 3.5}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={700}
                  fill="white"
                >
                  START
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </text>
              </g>
            )}

            {EDGES.map(function (e, i) {
              if (!edgeVis(e)) return null;
              var hi = edgeHi(e);
              var st = ETYPE[e.type];
              var mid = edgeMid(e);
              var lw = e.label.length * 4.5 + 14;
              return (
                <g
                  key={i}
                  opacity={hi ? (active ? 0.95 : 0.3) : 0.05}
                  style={{ transition: "opacity .2s", pointerEvents: "none" }}
                >
                  <path
                    d={edgePath(e)}
                    fill="none"
                    stroke={st.color}
                    strokeWidth={hi && active ? 2 : 1.2}
                    strokeDasharray={st.dash}
                    markerEnd={"url(#a-" + e.type + ")"}
                  />
                  {hi && active && (
                    <g>
                      <rect
                        x={mid.x - lw / 2}
                        y={mid.y - 8}
                        width={lw}
                        height={16}
                        rx={4}
                        fill="white"
                        stroke={st.color}
                        strokeWidth={0.5}
                        opacity={0.95}
                      />
                      <text
                        x={mid.x}
                        y={mid.y + 3}
                        textAnchor="middle"
                        fontSize={7.5}
                        fontWeight={600}
                        fill={st.color}
                      >
                        {e.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {NODES.map(function (n) {
              var r = nodeRect(n);
              var ro = ROLE[n.role];
              var vis = nodeOk(n.id);
              var isSel = sel === n.id;
              var isHov = hov === n.id;
              var bw = ro.label.length * 5.2 + 12;
              return (
                <g
                  key={n.id}
                  opacity={vis ? 1 : 0.1}
                  style={{ cursor: "pointer", transition: "opacity .2s" }}
                  onClick={function (ev) {
                    ev.stopPropagation();
                    setSel(sel === n.id ? null : n.id);
                  }}
                  onMouseEnter={function () {
                    setHov(n.id);
                  }}
                  onMouseLeave={function () {
                    setHov(null);
                  }}
                >
                  <rect
                    x={r.x}
                    y={r.y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill="white"
                    stroke={isSel || isHov ? ro.color : "#E2E8F0"}
                    strokeWidth={isSel ? 2.5 : isHov ? 1.5 : 1}
                    filter="url(#sh)"
                  />
                  <rect
                    x={r.x + 1}
                    y={r.y + 6}
                    width={3}
                    height={NODE_H - 12}
                    rx={1.5}
                    fill={ro.color}
                  />
                  <text
                    x={r.x + 12}
                    y={r.y + 18}
                    fontSize={11}
                    fontWeight={700}
                    fill="#1E293B"
                  >
                    {n.name}
                  </text>
                  <text x={r.x + 12} y={r.y + 30} fontSize={8} fill="#94A3B8">
                    {n.path}
                  </text>
                  <rect
                    x={r.x + 12}
                    y={r.y + 36}
                    width={bw}
                    height={14}
                    rx={3}
                    fill={ro.color}
                    opacity={0.1}
                  />
                  <text
                    x={r.x + 18}
                    y={r.y + 46}
                    fontSize={7}
                    fontWeight={600}
                    fill={ro.color}
                  >
                    {ro.label}
                  </text>
                  {n.deps > 0 && (
                    <g>
                      <circle
                        cx={r.x + NODE_W - 14}
                        cy={r.y + 14}
                        r={9}
                        fill={ro.color}
                        opacity={0.1}
                      />
                      <text
                        x={r.x + NODE_W - 14}
                        y={r.y + 17.5}
                        textAnchor="middle"
                        fontSize={8.5}
                        fontWeight={700}
                        fill={ro.color}
                      >
                        {n.deps}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #E2E8F0",
            background: "white",
            display: "flex",
            gap: 14,
            alignItems: "center",
            fontSize: 11,
            color: "#64748B",
            flexWrap: "wrap",
          }}
        >
          <b style={{ color: "#475569" }}>Roles:</b>
          {Object.entries(ROLE).map(function (entry) {
            var k = entry[0];
            var v = entry[1];
            return (
              <span
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: v.color,
                    display: "inline-block",
                  }}
                />{" "}
                {v.label}
              </span>
            );
          })}
          <span
            style={{
              width: 1,
              height: 14,
              background: "#E2E8F0",
              display: "inline-block",
            }}
          />
          <b style={{ color: "#475569" }}>Edges:</b>
          {Object.entries(ETYPE).map(function (entry) {
            var k = entry[0];
            var v = entry[1];
            return (
              <span
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <svg width={16} height={4}>
                  <line
                    x1={0}
                    y1={2}
                    x2={16}
                    y2={2}
                    stroke={v.color}
                    strokeWidth={2}
                    strokeDasharray={v.dash}
                  />
                </svg>
                {v.label}
              </span>
            );
          })}
          <span
            style={{
              width: 1,
              height: 14,
              background: "#E2E8F0",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#94A3B8" }}>
            Hover to highlight · Click to explore
          </span>
        </div>
      </div>

      <div
        style={{
          width: sel ? 320 : 0,
          transition: "width .25s ease",
          borderLeft: sel ? "1px solid #E2E8F0" : "none",
          background: "white",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {sel && selN && selE && (
          <div
            style={{
              width: 320,
              padding: "20px 16px",
              height: "100%",
              overflowY: "auto",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: ROLE[selN.role].color,
                    color: "white",
                    fontSize: 9,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {ROLE[selN.role].label.toUpperCase()}
                </div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  {selN.name}
                </h2>
                <p
                  style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}
                >
                  {selN.path + selN.name}
                </p>
              </div>
              <button
                onClick={function (e) {
                  e.stopPropagation();
                  setSel(null);
                }}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: 6,
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <Section title="Summary">
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "#475569",
                }}
              >
                {selE.sum}
              </p>
            </Section>

            <Section title="Exports">
              {selE.exp.map(function (ex, i) {
                return (
                  <div
                    key={i}
                    style={{
                      padding: "4px 8px",
                      background: "#F8FAFC",
                      borderRadius: 5,
                      fontSize: 11.5,
                      fontFamily: "SF Mono,Menlo,monospace",
                      color: "#334155",
                      marginBottom: 3,
                    }}
                  >
                    {ex}
                  </div>
                );
              })}
            </Section>

            <Section title={"Connections (" + selEdges.length + ")"}>
              {selEdges.map(function (e, i) {
                var out = e.from === sel;
                var oId = out ? e.to : e.from;
                var oN = NM[oId];
                var st = ETYPE[e.type];
                return (
                  <div
                    key={i}
                    onClick={function (ev) {
                      ev.stopPropagation();
                      setSel(oId);
                    }}
                    style={{
                      padding: "7px 8px",
                      borderRadius: 7,
                      border: "1px solid #F1F5F9",
                      marginBottom: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      cursor: "pointer",
                      background: "white",
                    }}
                    onMouseEnter={function (ev) {
                      ev.currentTarget.style.background = "#F8FAFC";
                      setHov(oId);
                    }}
                    onMouseLeave={function (ev) {
                      ev.currentTarget.style.background = "white";
                      setHov(null);
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: st.color,
                        background: st.color + "18",
                        padding: "2px 5px",
                        borderRadius: 3,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {out ? "→ uses" : "← used by"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600 }}>
                        {oN.name}
                      </div>
                      <div style={{ fontSize: 9.5, color: "#94A3B8" }}>
                        {e.label}
                      </div>
                    </div>
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 1,
                        background: ROLE[oN.role].color,
                        flexShrink: 0,
                      }}
                    />
                  </div>
                );
              })}
            </Section>

            <div
              style={{
                padding: 10,
                borderRadius: 7,
                background: "#FFFBEB",
                border: "1px solid #FEF3C7",
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  lineHeight: 1.55,
                  color: "#92400E",
                }}
              >
                {selE.tip}
              </p>
            </div>

            <div
              style={{
                padding: "7px 10px",
                borderRadius: 7,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: selE.impact.startsWith("High")
                  ? "#FEF2F2"
                  : selE.impact.startsWith("Medium")
                    ? "#FFF7ED"
                    : "#F0FDF4",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  color: selE.impact.startsWith("High")
                    ? "#DC2626"
                    : selE.impact.startsWith("Medium")
                      ? "#D97706"
                      : "#16A34A",
                }}
              >
                Impact
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: selE.impact.startsWith("High")
                    ? "#991B1B"
                    : selE.impact.startsWith("Medium")
                      ? "#92400E"
                      : "#166534",
                }}
              >
                {selE.impact}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
