"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { FixedLayer } from "@/lib/layers";

export type GraphFile = {
  id: string;
  label: string;
  path: string;
  language: string;
  role: string;
  inDegree: number;
  outDegree: number;
};

export type GraphModule = {
  layerIndex: number;
  moduleName: string;
  files: GraphFile[];
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  edgeType: "composition" | "data" | "utility";
};

interface ArchGraphProps {
  repoName: string;
  stackName?: string;
  layers: FixedLayer[];
  modules: GraphModule[];
  edges: GraphEdge[];
  selectedFileId: string | null;
  onFileSelect: (fileId: string | null) => void;
}

const CW = 900;
const PAD = 28;
const MOD_W = 156;
const MOD_G = 14;
const F_H = 28;
const MOD_H = 40;
const MOD_PB = 6;
const L_H = 22;
const L_G = 12;

export default function ArchGraph({
  repoName,
  stackName,
  layers,
  modules,
  edges,
  selectedFileId,
  onFileSelect,
}: ArchGraphProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Expand first two modules by default
    const initial = new Set<string>();
    for (let i = 0; i < Math.min(2, modules.length); i++) {
      initial.add(`${modules[i].layerIndex}/${modules[i].moduleName}`);
    }
    return initial;
  });
  const [search, setSearch] = useState("");
  const [hovFile, setHovFile] = useState<string | null>(null);

  // Build file lookup
  const { fileMap, allModKeys } = useMemo(() => {
    const fm: Record<
      string,
      GraphFile & { modKey: string; layerIndex: number; moduleName: string }
    > = {};
    const mk: string[] = [];
    for (const mod of modules) {
      const k = `${mod.layerIndex}/${mod.moduleName}`;
      mk.push(k);
      for (const f of mod.files) {
        fm[f.id] = { ...f, modKey: k, layerIndex: mod.layerIndex, moduleName: mod.moduleName };
      }
    }
    return { fileMap: fm, allModKeys: mk };
  }, [modules]);

  // Group modules by layer
  const layerModules = useMemo(() => {
    const map = new Map<number, GraphModule[]>();
    for (const mod of modules) {
      const list = map.get(mod.layerIndex) ?? [];
      list.push(mod);
      map.set(mod.layerIndex, list);
    }
    return map;
  }, [modules]);

  // Layout computation
  const layout = useMemo(() => {
    const avail = CW - 2 * PAD;
    const layerLayouts: {
      name: string;
      color: string;
      icon: string;
      y: number;
      h: number;
      layerIndex: number;
      mods: {
        key: string;
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
        isExp: boolean;
        files: { id: string; label: string; cx: number; cy: number; localTop: number }[];
        fileCount: number;
        midX: number;
        midY: number;
      }[];
    }[] = [];
    let curY = 12;

    for (const layer of layers) {
      const mods = layerModules.get(layer.index) ?? [];
      if (mods.length === 0) continue;

      const lY = curY;
      curY += L_H + 8;
      const N = mods.length;
      const totalW = N * MOD_W + (N - 1) * MOD_G;
      const startX = PAD + Math.max(0, (avail - totalW) / 2);
      let maxH = MOD_H;
      const modLayouts: typeof layerLayouts[0]["mods"] = [];

      mods.forEach((m, i) => {
        const k = `${m.layerIndex}/${m.moduleName}`;
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
        modLayouts.push({
          key: k,
          name: m.moduleName,
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
      layerLayouts.push({
        name: layer.name,
        color: layer.color,
        icon: layer.icon,
        y: lY,
        h: curY - lY,
        layerIndex: layer.index,
        mods: modLayouts,
      });
      curY += L_G;
    }

    return { layers: layerLayouts, totalH: curY + 8 };
  }, [expanded, layers, layerModules]);

  // Position lookups
  const { filePos, modPos } = useMemo(() => {
    const fp: Record<string, { x: number; y: number }> = {};
    const mp: Record<string, { cx: number; cy: number }> = {};
    for (const l of layout.layers) {
      for (const m of l.mods) {
        mp[m.key] = { cx: m.midX, cy: m.midY };
        for (const f of m.files) {
          fp[f.id] = { x: f.cx, y: f.cy };
        }
      }
    }
    return { filePos: fp, modPos: mp };
  }, [layout]);

  // Highlight logic
  const focal = selectedFileId ?? hovFile;
  const { litEdges, litFiles } = useMemo(() => {
    if (!focal) return { litEdges: [] as GraphEdge[], litFiles: new Set<string>() };
    const es = edges.filter((e) => e.source === focal || e.target === focal);
    const fs = new Set([focal]);
    es.forEach((e) => {
      fs.add(e.source);
      fs.add(e.target);
    });
    return { litEdges: es, litFiles: fs };
  }, [focal, edges]);
  const hasHL = litFiles.size > 0;
  const litMods = useMemo(() => {
    const s = new Set<string>();
    litFiles.forEach((id) => {
      if (fileMap[id]) s.add(fileMap[id].modKey);
    });
    return s;
  }, [litFiles, fileMap]);

  const toggle = useCallback((k: string) => {
    setExpanded((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  }, []);

  const results = search
    ? Object.values(fileMap)
        .filter(
          (f) =>
            f.label.toLowerCase().includes(search.toLowerCase()) ||
            f.moduleName.toLowerCase().includes(search.toLowerCase()) ||
            f.path.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 10)
    : [];

  const totalFiles = Object.keys(fileMap).length;

  return (
    <div
      onClick={() => onFileSelect(null)}
      style={{
        fontFamily: "Inter, -apple-system, sans-serif",
        color: "#1E293B",
      }}
    >
      {/* Header */}
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
                boxShadow: "0 0 8px rgba(52,211,153,0.4)",
              }}
            />
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", color: "#0F172A" }}>
              {repoName}
            </span>
            {stackName && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "#E0E7FF",
                  color: "#4338CA",
                }}
              >
                {stackName}
              </span>
            )}
            <span style={{ fontSize: 10, color: "#94A3B8" }}>
              {totalFiles} files &middot; {allModKeys.length} modules
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(new Set(allModKeys)); }}
              style={btnStyle}
              type="button"
            >
              <Maximize2 size={11} /> Expand
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(new Set()); }}
              style={btnStyle}
              type="button"
            >
              <Minimize2 size={11} /> Collapse
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", margin: "10px 0 6px" }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: 9, color: "#94A3B8" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search files or modules..."
            style={{
              width: "100%",
              padding: "7px 30px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              color: "#1E293B",
              fontSize: 11,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {search && (
            <X
              size={13}
              onClick={(e) => { e.stopPropagation(); setSearch(""); }}
              style={{
                position: "absolute",
                right: 10,
                top: 9,
                color: "#94A3B8",
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
                background: "white",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                maxHeight: 200,
                overflowY: "auto",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
              }}
            >
              {results.map((f) => {
                const layerColor = layers.find((l) => l.index === f.layerIndex)?.color ?? "#94A3B8";
                return (
                  <div
                    key={f.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded((p) => { const n = new Set(Array.from(p)); n.add(f.modKey); return n; });
                      onFileSelect(f.id);
                      setSearch("");
                    }}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontSize: 10,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <span style={{ color: layerColor, fontWeight: 600 }}>{f.label}</span>
                    <span style={{ color: "#94A3B8", fontSize: 8, marginLeft: "auto" }}>
                      {f.modKey}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <p style={{ fontSize: 9.5, color: "#94A3B8", margin: 0 }}>
          Click modules to expand &middot; Hover files to trace dependencies &middot; Click to pin
        </p>
      </div>

      {/* Graph area */}
      <div
        style={{
          maxWidth: CW,
          margin: "0 auto",
          position: "relative",
          height: layout.totalH,
        }}
      >
        {/* SVG edges */}
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
              litEdges.map((e) => {
                const fromFP = filePos[e.source];
                const toFP = filePos[e.target];
                const fromMP = modPos[fileMap[e.source]?.modKey];
                const toMP = modPos[fileMap[e.target]?.modKey];
                if (!fromMP || !toMP) return null;
                const sx = fromFP?.x ?? fromMP.cx;
                const sy = fromFP?.y ?? fromMP.cy;
                const ex = toFP?.x ?? toMP.cx;
                const ey = toFP?.y ?? toMP.cy;
                const dy = ey - sy;
                const cp = Math.max(40, Math.abs(dy) * 0.35);
                const sign = dy >= 0 ? 1 : -1;
                const fromLayer = fileMap[e.source]?.layerIndex ?? 0;
                const col = layers.find((l) => l.index === fromLayer)?.color ?? "#94A3B8";
                const d = `M${sx},${sy} C${sx},${sy + sign * cp} ${ex},${ey - sign * cp} ${ex},${ey}`;
                return (
                  <g key={`${e.source}-${e.target}`}>
                    <motion.path
                      d={d}
                      fill="none"
                      stroke={col}
                      strokeWidth={5}
                      opacity={0.08}
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
                      opacity={0.6}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                    <circle cx={sx} cy={sy} r={3} fill={col} opacity={0.7}>
                      <animate attributeName="r" values="2;3.5;2" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                    <circle cx={ex} cy={ey} r={3} fill={col} opacity={0.7}>
                      <animate attributeName="r" values="2;3.5;2" dur="1.8s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              })}
          </AnimatePresence>
        </svg>

        {/* Layer bands and modules */}
        {layout.layers.map((layer) => (
          <div key={layer.name}>
            {/* Layer label */}
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
                opacity: 0.7,
                zIndex: 2,
              }}
            >
              <span>{layer.icon}</span> {layer.name}
            </div>
            {/* Layer background band */}
            <div
              style={{
                position: "absolute",
                left: PAD - 8,
                right: PAD - 8,
                top: layer.y + L_H,
                height: layer.h - L_H - L_G,
                background: `${layer.color}08`,
                borderRadius: 12,
                border: `1px solid ${layer.color}12`,
                zIndex: 1,
              }}
            />

            {/* Modules */}
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
                  {/* Module background */}
                  <div
                    onClick={(ev) => { ev.stopPropagation(); toggle(mod.key); }}
                    style={{
                      width: "100%",
                      height: "100%",
                      background: mDim
                        ? "#F8FAFC"
                        : mLit
                          ? `${layer.color}14`
                          : `${layer.color}09`,
                      border: `1px solid ${mLit ? layer.color + "44" : mDim ? "#E2E8F0" : layer.color + "22"}`,
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      opacity: mDim ? 0.4 : 1,
                      boxShadow: mLit ? `0 0 24px ${layer.color}12` : "none",
                    }}
                  />
                  {/* Module header */}
                  <div
                    onClick={(ev) => { ev.stopPropagation(); toggle(mod.key); }}
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
                      opacity: mDim ? 0.4 : 1,
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
                        opacity: 0.7,
                        background: layer.color + "15",
                        padding: "1px 5px",
                        borderRadius: 4,
                        fontWeight: 600,
                      }}
                    >
                      {mod.fileCount}
                    </span>
                  </div>
                  {/* Files */}
                  {mod.isExp &&
                    mod.files.map((file) => {
                      const fLit = litFiles.has(file.id);
                      const fSel = selectedFileId === file.id;
                      const fDim = hasHL && !litFiles.has(file.id);
                      return (
                        <div
                          key={file.id}
                          onMouseEnter={() => setHovFile(file.id)}
                          onMouseLeave={() => setHovFile(null)}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onFileSelect(selectedFileId === file.id ? null : file.id);
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
                            fontFamily: "'SF Mono', Monaco, Consolas, monospace",
                            borderRadius: 5,
                            cursor: "pointer",
                            background: fSel
                              ? layer.color + "20"
                              : fLit
                                ? layer.color + "10"
                                : "white",
                            color: fDim
                              ? "#CBD5E1"
                              : fSel || fLit
                                ? "#0F172A"
                                : "#475569",
                            border: `1px solid ${fSel ? layer.color + "55" : fLit ? layer.color + "30" : "#E2E8F0"}`,
                            transition: "all 0.15s",
                            opacity: fDim ? 0.3 : 1,
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
      </div>

      {/* Legend */}
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
        {layers.map((l) => (
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
                opacity: 0.8,
              }}
            />
            <span style={{ fontSize: 9, color: "#64748B", fontWeight: 600 }}>
              {l.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #E2E8F0",
  background: "white",
  color: "#64748B",
  fontSize: 10,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
