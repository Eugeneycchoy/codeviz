"use client";

import { getBezierPath, type EdgeProps } from "reactflow";

export type GraphEdgeData = {
  edgeType: "composition" | "data" | "utility";
  label: string;
};

const EDGE_STYLES: Record<string, { color: string; dash: string }> = {
  composition: { color: "#818CF8", dash: "" },
  data: { color: "#34D399", dash: "6,3" },
  utility: { color: "#F59E0B", dash: "3,3" },
};

export function GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps<GraphEdgeData>) {
  const edgeType = data?.edgeType ?? "composition";
  const st = EDGE_STYLES[edgeType] ?? EDGE_STYLES.composition;
  const opacity = typeof style?.opacity === "number" ? style.opacity : 0.3;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const markerId = `arrow-${edgeType}-${id}`;
  const showLabel = opacity > 0.5 && data?.label;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill={st.color} />
        </marker>
      </defs>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={st.color}
        strokeWidth={opacity > 0.5 ? 2 : 1.2}
        strokeDasharray={st.dash}
        markerEnd={`url(#${markerId})`}
        style={{ opacity, transition: "opacity 0.2s" }}
      />
      {showLabel && (
        <foreignObject
          x={labelX - 40}
          y={labelY - 10}
          width={80}
          height={20}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span
              style={{
                background: "white",
                border: `1px solid ${st.color}`,
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 7.5,
                fontWeight: 600,
                color: st.color,
                whiteSpace: "nowrap",
              }}
            >
              {data?.label}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  );
}
