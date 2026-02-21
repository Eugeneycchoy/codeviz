"use client";

import type { Node, Edge } from "reactflow";
import type { NodeData } from "@/components/FileNode";
import { X, Loader2 } from "lucide-react";

const ROLE_COLOR: Record<string, string> = {
  entry: "#6366F1",
  hub: "#D97706",
  shared: "#0891B2",
  leaf: "#9CA3AF",
};

const ROLE_LABEL: Record<string, string> = {
  entry: "Entry",
  hub: "Hub",
  shared: "Shared",
  leaf: "Leaf",
};

const EDGE_TYPE_COLOR: Record<string, string> = {
  composition: "#818CF8",
  data: "#34D399",
  utility: "#F59E0B",
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTip(role: string, inDegree: number): string {
  switch (role) {
    case "entry":
      return "Entry point \u2014 start here to trace the dependency chain.";
    case "hub":
      return `Hub file \u2014 ${inDegree} files depend on this. Wide blast radius.`;
    case "shared":
      return "Shared module \u2014 used in multiple places.";
    default:
      return "Leaf file \u2014 no dependents. Safe to modify in isolation.";
  }
}

function getImpact(inDegree: number): { level: string; color: string; bg: string; textColor: string } {
  if (inDegree >= 5) return { level: "High", color: "#DC2626", bg: "#FEF2F2", textColor: "#991B1B" };
  if (inDegree >= 2) return { level: "Medium", color: "#D97706", bg: "#FFF7ED", textColor: "#92400E" };
  return { level: "Low", color: "#16A34A", bg: "#F0FDF4", textColor: "#166534" };
}

interface SidePanelProps {
  node: Node<NodeData>;
  edges: Edge[];
  allNodes: Node<NodeData>[];
  explanation: string | null;
  explanationLoading: boolean;
  onClose: () => void;
  onNodeNavigate: (nodeId: string) => void;
  onNodeHover: (nodeId: string | null) => void;
}

export function SidePanel({
  node,
  edges,
  allNodes,
  explanation,
  explanationLoading,
  onClose,
  onNodeNavigate,
  onNodeHover,
}: SidePanelProps) {
  const role = (node.data?.role as string) ?? "leaf";
  const accent = ROLE_COLOR[role] ?? ROLE_COLOR.leaf;
  const roleLabel = ROLE_LABEL[role] ?? "Leaf";
  const inDegree = (node.data?.inDegree as number) ?? 0;
  const outDegree = (node.data?.outDegree as number) ?? 0;
  const impact = getImpact(inDegree);
  const tip = getTip(role, inDegree);

  // Build connections: incoming + outgoing
  const connections = edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => {
      const outgoing = e.source === node.id;
      const otherId = outgoing ? e.target : e.source;
      const otherNode = allNodes.find((n) => n.id === otherId);
      const edgeType = (e.data?.edgeType as string) ?? "composition";
      return {
        id: e.id,
        otherId,
        otherName: (otherNode?.data?.label as string) ?? otherId,
        otherRole: (otherNode?.data?.role as string) ?? "leaf",
        edgeType,
        edgeLabel: (e.data?.label as string) ?? "",
        direction: outgoing ? ("out" as const) : ("in" as const),
      };
    });

  return (
    <div
      style={{
        width: 320,
        padding: "16px 14px",
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      }}
    >
      {/* Header */}
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
              background: accent,
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {roleLabel.toUpperCase()}
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#1E293B" }}>
            {node.data?.label as string}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8" }}>
            {node.data?.path as string}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
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
          <X size={14} />
        </button>
      </div>

      {/* Summary / AI Explanation */}
      <Section title="Summary">
        {explanationLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748B" }}>
            <Loader2 size={14} className="animate-spin" />
            <span style={{ fontSize: 12 }}>Loading explanation...</span>
          </div>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "#475569",
            }}
          >
            {explanation ?? "No explanation available."}
          </p>
        )}
      </Section>

      {/* Connections */}
      <Section title={`Connections (${connections.length})`}>
        {connections.length === 0 ? (
          <p style={{ fontSize: 12, color: "#94A3B8" }}>No connections.</p>
        ) : (
          connections.map((c) => {
            const edgeColor = EDGE_TYPE_COLOR[c.edgeType] ?? "#818CF8";
            const otherAccent = ROLE_COLOR[c.otherRole] ?? ROLE_COLOR.leaf;
            return (
              <div
                key={c.id}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onNodeNavigate(c.otherId);
                }}
                onMouseEnter={() => onNodeHover(c.otherId)}
                onMouseLeave={() => onNodeHover(null)}
                style={{
                  padding: "6px 8px",
                  borderRadius: 7,
                  border: "1px solid #F1F5F9",
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                  background: "white",
                  transition: "background 0.1s",
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: edgeColor,
                    background: hexToRgba(edgeColor, 0.1),
                    padding: "2px 5px",
                    borderRadius: 3,
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.direction === "out" ? "\u2192 uses" : "\u2190 used by"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1E293B" }}>
                    {c.otherName}
                  </div>
                  {c.edgeLabel && (
                    <div style={{ fontSize: 9.5, color: "#94A3B8" }}>
                      {c.edgeLabel}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 1,
                    background: otherAccent,
                    flexShrink: 0,
                  }}
                />
              </div>
            );
          })
        )}
      </Section>

      {/* Tip callout */}
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
          {tip}
        </p>
      </div>

      {/* Impact indicator */}
      <div
        style={{
          padding: "7px 10px",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: impact.bg,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: impact.color,
          }}
        >
          Impact
        </span>
        <span style={{ fontSize: 11, color: impact.textColor }}>
          {impact.level} &mdash; {inDegree} file{inDegree !== 1 ? "s" : ""} depend on this
        </span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
