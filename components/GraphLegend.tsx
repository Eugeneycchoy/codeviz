"use client";

const ROLE_ITEMS = [
  { label: "Entry", color: "#6366F1" },
  { label: "Hub", color: "#D97706" },
  { label: "Shared", color: "#0891B2" },
  { label: "Leaf", color: "#9CA3AF" },
];

const EDGE_ITEMS = [
  { label: "Renders", color: "#818CF8", dash: "" },
  { label: "Data flow", color: "#34D399", dash: "6,3" },
  { label: "Utility", color: "#F59E0B", dash: "3,3" },
];

export function GraphLegend() {
  return (
    <div
      style={{
        padding: "6px 14px",
        borderTop: "1px solid #E2E8F0",
        background: "white",
        display: "flex",
        gap: 12,
        alignItems: "center",
        fontSize: 11,
        color: "#64748B",
        flexWrap: "wrap",
      }}
    >
      <b style={{ color: "#475569" }}>Roles:</b>
      {ROLE_ITEMS.map((r) => (
        <span
          key={r.label}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: r.color,
              display: "inline-block",
            }}
          />
          {r.label}
        </span>
      ))}
      <span
        style={{
          width: 1,
          height: 14,
          background: "#E2E8F0",
          display: "inline-block",
        }}
      />
      <b style={{ color: "#475569" }}>Edges:</b>
      {EDGE_ITEMS.map((e) => (
        <span
          key={e.label}
          style={{ display: "flex", alignItems: "center", gap: 4 }}
        >
          <svg width={16} height={4}>
            <line
              x1={0}
              y1={2}
              x2={16}
              y2={2}
              stroke={e.color}
              strokeWidth={2}
              strokeDasharray={e.dash}
            />
          </svg>
          {e.label}
        </span>
      ))}
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
  );
}
