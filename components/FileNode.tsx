"use client";

import type { CSSProperties } from "react";
import { Handle, type NodeProps, Position } from "reactflow";

export type NodeData = {
  label: string;
  path: string;
  language: string;
  isOrphan: boolean;
  role: string | null;
  inDegree: number;
  outDegree: number;
  highlighted?: boolean;
  layer?: number;
};

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

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getParentPath(fullPath: string): string {
  const lastSlash = fullPath.lastIndexOf("/");
  if (lastSlash === -1) return "root";
  return fullPath.slice(0, lastSlash) || "root";
}

const HANDLE_STYLE: CSSProperties = {
  opacity: 0,
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: "none",
  background: "transparent",
};

export function FileNode({
  data,
  selected,
  style,
}: NodeProps<NodeData> & { style?: CSSProperties }) {
  const role = data.role ?? "leaf";
  const accent = ROLE_COLOR[role] ?? ROLE_COLOR.leaf;
  const roleLabel = ROLE_LABEL[role] ?? "Leaf";
  const parentPath = getParentPath(data.path);
  const depCount = (data.inDegree ?? 0) + (data.outDegree ?? 0);

  return (
    <div
      style={{
        ...style,
        position: "relative",
        minWidth: 155,
        padding: "8px 10px",
        background: "white",
        borderRadius: 8,
        border: `1px solid ${selected ? accent : "#E2E8F0"}`,
        borderLeft: `3px solid ${accent}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "border-color 0.15s, box-shadow 0.15s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = accent;
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#E2E8F0";
          (e.currentTarget as HTMLDivElement).style.borderLeft = `3px solid ${accent}`;
        }
      }}
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />

      {data.highlighted && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none file-node-pulse-ring"
          aria-hidden
        />
      )}

      {/* Dep count circle */}
      {depCount > 0 && (
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: hexToRgba(accent, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 8.5, fontWeight: 700, color: accent }}>
            {depCount}
          </span>
        </div>
      )}

      {/* File name */}
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 700,
          color: "#1E293B",
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          paddingRight: depCount > 0 ? 22 : 0,
        }}
      >
        {data.label}
      </p>

      {/* Path */}
      <p
        style={{
          margin: "1px 0 0",
          fontSize: 8,
          color: "#94A3B8",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {parentPath}
      </p>

      {/* Role badge pill */}
      <div
        style={{
          marginTop: 4,
          display: "inline-block",
          padding: "1px 6px",
          borderRadius: 3,
          background: hexToRgba(accent, 0.1),
          fontSize: 7,
          fontWeight: 600,
          color: accent,
        }}
      >
        {roleLabel}
      </div>

      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}
