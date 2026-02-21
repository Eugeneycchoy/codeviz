"use client";

import { type RefObject } from "react";
import Link from "next/link";
import { ChevronRight, Search, FileCode, Box } from "lucide-react";
import type { Node } from "reactflow";
import type { NodeData } from "@/components/FileNode";

const EDGE_FILTER_OPTIONS = [
  { key: "all", label: "All connections", color: "#334155" },
  { key: "composition", label: "Renders", color: "#818CF8" },
  { key: "data", label: "Data flow", color: "#34D399" },
  { key: "utility", label: "Utility", color: "#F59E0B" },
] as const;

export type EdgeFilter = "all" | "composition" | "data" | "utility";

interface GraphHeaderProps {
  repoName: string;
  stackName?: string;
  edgeFilter: EdgeFilter;
  onEdgeFilterChange: (filter: EdgeFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: Node<NodeData>[];
  onSearchSelect: (nodeId: string) => void;
  searchContainerRef: RefObject<HTMLDivElement>;
}

export function GraphHeader({
  repoName,
  stackName,
  edgeFilter,
  onEdgeFilterChange,
  searchQuery,
  onSearchChange,
  searchResults,
  onSearchSelect,
  searchContainerRef,
}: GraphHeaderProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
        </Link>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
          style={{
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
          }}
        >
          <span className="text-xs font-extrabold text-white tracking-wide">
            {repoName.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <span className="font-semibold text-sm text-slate-800">{repoName}</span>
        {stackName && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#E0E7FF", color: "#4338CA" }}
          >
            {stackName}
          </span>
        )}
        <span className="text-slate-300">/</span>
        <span className="text-slate-500 text-xs font-medium">
          Dependency Graph
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {EDGE_FILTER_OPTIONS.map((opt) => {
            const active = edgeFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onEdgeFilterChange(opt.key as EdgeFilter)}
                className="transition-all"
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: active ? "none" : "1px solid #E2E8F0",
                  background: active ? opt.color : "white",
                  color: active ? "white" : "#64748B",
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div ref={searchContainerRef} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all w-52"
          />
          {searchQuery.trim() && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg border border-slate-200 bg-white shadow-xl z-50 max-h-60 overflow-auto">
              {searchResults.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => onSearchSelect(node.id)}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <FileCode className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {node.data?.label ?? node.id}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
