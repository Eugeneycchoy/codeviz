"use client";

import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import type { FixedLayer } from "@/lib/layers";
import type { GraphFile, GraphModule, GraphEdge } from "@/components/ArchGraph";

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

function getImpact(inDegree: number): { level: string; color: string; bg: string; textColor: string } {
  if (inDegree >= 5) return { level: "High", color: "#DC2626", bg: "#FEF2F2", textColor: "#991B1B" };
  if (inDegree >= 2) return { level: "Medium", color: "#D97706", bg: "#FFF7ED", textColor: "#92400E" };
  return { level: "Low", color: "#16A34A", bg: "#F0FDF4", textColor: "#166534" };
}

interface ArchDetailPanelProps {
  fileId: string;
  layers: FixedLayer[];
  modules: GraphModule[];
  edges: GraphEdge[];
  explanation: string | null;
  explanationLoading: boolean;
  onClose: () => void;
  onFileSelect: (fileId: string) => void;
}

export function ArchDetailPanel({
  fileId,
  layers,
  modules,
  edges,
  explanation,
  explanationLoading,
  onClose,
  onFileSelect,
}: ArchDetailPanelProps) {
  // Find the file across all modules
  let file: GraphFile | null = null;
  let layerIndex = 4;
  let moduleName = "";
  for (const mod of modules) {
    const found = mod.files.find((f) => f.id === fileId);
    if (found) {
      file = found;
      layerIndex = mod.layerIndex;
      moduleName = mod.moduleName;
      break;
    }
  }
  if (!file) return null;

  const layer = layers.find((l) => l.index === layerIndex);
  const layerColor = layer?.color ?? "#94A3B8";
  const layerName = layer?.name ?? "Unknown";
  const role = file.role ?? "leaf";
  const accent = ROLE_COLOR[role] ?? ROLE_COLOR.leaf;
  const roleLabel = ROLE_LABEL[role] ?? "Leaf";
  const impact = getImpact(file.inDegree);

  // Build file lookup for chip labels
  const fileMap = new Map<string, { label: string; layerIndex: number }>();
  for (const mod of modules) {
    for (const f of mod.files) {
      fileMap.set(f.id, { label: f.label, layerIndex: mod.layerIndex });
    }
  }

  const outgoing = edges
    .filter((e) => e.source === fileId)
    .map((e) => {
      const info = fileMap.get(e.target);
      return info ? { id: e.target, label: info.label, layerIndex: info.layerIndex } : null;
    })
    .filter(Boolean) as { id: string; label: string; layerIndex: number }[];

  const incoming = edges
    .filter((e) => e.target === fileId)
    .map((e) => {
      const info = fileMap.get(e.source);
      return info ? { id: e.source, label: info.label, layerIndex: info.layerIndex } : null;
    })
    .filter(Boolean) as { id: string; label: string; layerIndex: number }[];

  return (
    <motion.div
      key="detail-panel"
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      onClick={(ev) => ev.stopPropagation()}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        width: 260,
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        padding: "14px 16px",
        zIndex: 100,
        boxShadow: "0 16px 48px rgba(0,0,0,0.08)",
        fontFamily: "Inter, -apple-system, sans-serif",
        maxHeight: "calc(100% - 16px)",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: layerColor }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", flex: 1 }}>
          {file.label}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{
            background: "#F1F5F9",
            border: "none",
            borderRadius: 6,
            width: 22,
            height: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748B",
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Badges */}
      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: layerColor,
            background: layerColor + "15",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {layerName}
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: "#64748B",
            background: "#F1F5F9",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {moduleName}
        </span>
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            color: accent,
            background: accent + "15",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Path */}
      <div
        style={{
          fontSize: 9,
          color: "#64748B",
          background: "#F8FAFC",
          padding: "5px 8px",
          borderRadius: 6,
          marginBottom: 10,
          fontFamily: "monospace",
          wordBreak: "break-all",
          border: "1px solid #F1F5F9",
        }}
      >
        {file.path}
      </div>

      {/* AI Explanation */}
      <SectionTitle>Summary</SectionTitle>
      {explanationLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748B", marginBottom: 10 }}>
          <Loader2 size={12} className="animate-spin" />
          <span style={{ fontSize: 11 }}>Loading...</span>
        </div>
      ) : (
        <p style={{ margin: "0 0 10px", fontSize: 11.5, lineHeight: 1.6, color: "#475569" }}>
          {explanation ?? "No explanation available."}
        </p>
      )}

      {/* Imports */}
      {outgoing.length > 0 && (
        <>
          <SectionTitle>&rarr; Imports ({outgoing.length})</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {outgoing.map((d) => {
              const c = layers.find((l) => l.index === d.layerIndex)?.color ?? "#94A3B8";
              return (
                <span
                  key={d.id}
                  onClick={(e) => { e.stopPropagation(); onFileSelect(d.id); }}
                  style={{
                    padding: "2px 7px",
                    borderRadius: 5,
                    fontSize: 8,
                    fontWeight: 600,
                    background: c + "12",
                    color: c,
                    cursor: "pointer",
                    border: `1px solid ${c}15`,
                  }}
                >
                  {d.label}
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* Used by */}
      {incoming.length > 0 && (
        <>
          <SectionTitle>&larr; Used by ({incoming.length})</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {incoming.map((d) => {
              const c = layers.find((l) => l.index === d.layerIndex)?.color ?? "#94A3B8";
              return (
                <span
                  key={d.id}
                  onClick={(e) => { e.stopPropagation(); onFileSelect(d.id); }}
                  style={{
                    padding: "2px 7px",
                    borderRadius: 5,
                    fontSize: 8,
                    fontWeight: 600,
                    background: c + "12",
                    color: c,
                    cursor: "pointer",
                    border: `1px solid ${c}15`,
                  }}
                >
                  {d.label}
                </span>
              );
            })}
          </div>
        </>
      )}

      {/* Impact */}
      <div
        style={{
          padding: "6px 10px",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: impact.bg,
        }}
      >
        <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: impact.color }}>
          Impact
        </span>
        <span style={{ fontSize: 10, color: impact.textColor }}>
          {impact.level} &mdash; {file.inDegree} file{file.inDegree !== 1 ? "s" : ""} depend on this
        </span>
      </div>
    </motion.div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: 5,
      }}
    >
      {children}
    </div>
  );
}
