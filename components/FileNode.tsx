"use client";

import type { CSSProperties } from "react";
import { Handle, type NodeProps, Position } from "reactflow";
import { FileCode } from "lucide-react";

export type NodeData = {
  label: string;
  path: string;
  language: string;
  isOrphan: boolean;
  role: string | null;
  inDegree: number;
  outDegree: number;
  highlighted?: boolean;
  /** Functional layer index for band layout (0=PAGES, 1=API ROUTES, 2=COMPONENTS, 3=LIBRARY, 4=CONFIG). */
  layer?: number;
};

const LANGUAGE_BORDER: Record<string, string> = {
  ts: "#7c3aed",
  tsx: "#2563eb",
  js: "#d97706",
  jsx: "#0891b2",
  py: "#059669",
  css: "#db2777",
  scss: "#db2777",
  json: "#ea580c",
  md: "#94a3b8",
};
const DEFAULT_BORDER = "#cbd5e1";

function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) return "";
  return path.slice(lastDot + 1).toLowerCase();
}

function getBorderColor(extension: string): string {
  return LANGUAGE_BORDER[extension] ?? DEFAULT_BORDER;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getIconBgColor(extension: string): string {
  const accent = LANGUAGE_BORDER[extension] ?? DEFAULT_BORDER;
  return hexToRgba(accent, 0.1);
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

const ROLE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  entry: { label: "Entry", className: "bg-emerald-100 text-emerald-700" },
  hub: { label: "Hub", className: "bg-amber-100 text-amber-700" },
  shared: { label: "Shared", className: "bg-blue-100 text-blue-700" },
  leaf: { label: "Leaf", className: "bg-slate-100 text-slate-500" },
};

export function FileNode({
  data,
  selected,
  style,
}: NodeProps<NodeData> & { style?: CSSProperties }) {
  const ext = getExtension(data.path);
  const accent = getBorderColor(ext);
  const iconBg = getIconBgColor(ext);
  const parentPath = getParentPath(data.path);
  const roleBadge = data.role != null ? ROLE_BADGE[data.role] : null;
  const showImportCounts =
    !data.isOrphan && (data.inDegree > 0 || data.outDegree > 0);

  return (
    <div
      style={{
        ...style,
        borderLeft: `4px solid ${accent}`,
        padding: "0.75rem 1.25rem",
        position: "relative",
      }}
      className={
        selected
          ? "rounded-2xl border-2 border-blue-500 bg-white scale-[1.05] ring-8 ring-blue-50 shadow min-w-[180px]"
          : "rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-300 shadow min-w-[180px]"
      }
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      {roleBadge && (
        <span
          className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${roleBadge.className}`}
        >
          {roleBadge.label}
        </span>
      )}
      {data.highlighted && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none file-node-pulse-ring"
          aria-hidden
        />
      )}
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-xl shrink-0"
          style={{ backgroundColor: iconBg, color: accent }}
        >
          <FileCode className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold truncate leading-tight text-slate-800">
            {data.label}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
            {parentPath}
          </p>
          {showImportCounts && (
            <p className="text-[9px] text-slate-300 mt-0.5 font-medium">
              ↑ {data.outDegree} · ↓ {data.inDegree}
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}
