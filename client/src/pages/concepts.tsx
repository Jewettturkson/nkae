import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Sparkles } from "lucide-react";

type Subject = { id: number; name: string };
type GraphNode = { id: number; label: string; mastery: number; cardCount: number };
type GraphEdge = { a: number; b: number; weight: number };
type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

// Dim gray (unseen) -> indigo (in progress) -> amber (close to mastered),
// the same amber already used for the review-reason banner and Hard button,
// so this reads as "the app's accent for progress," not a new color system.
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(hexA: string, hexB: string, t: number) {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
}
function masteryColor(mastery: number) {
  const DIM = "#52525b";
  const MID = "#6366f1";
  const GOLD = "#fbbf24";
  if (mastery <= 0.6) return mixHex(DIM, MID, mastery / 0.6);
  return mixHex(MID, GOLD, (mastery - 0.6) / 0.4);
}

// Golden-angle spiral: fully deterministic, no physics simulation, and it
// naturally spreads a handful of nodes without them overlapping. A subject
// with only 2-3 concepts still looks intentional instead of empty.
function layout(nodes: GraphNode[], size: number) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 40;
  return nodes.map((node, i) => {
    const angle = i * 137.508 * (Math.PI / 180);
    const radius = nodes.length <= 1 ? 0 : Math.min(maxRadius, 22 * Math.sqrt(i + 1));
    return { ...node, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

export default function Concepts() {
  const [, setLocation] = useLocation();
  const { data: subjects = [] } = useQuery<Subject[]>({ queryKey: ["/api/subjects"] });
  const [subjectId, setSubjectId] = useState<string>("");

  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(String(subjects[0].id));
  }, [subjects, subjectId]);

  const { data: graph, isLoading } = useQuery<Graph>({
    queryKey: [`/api/concepts/graph?subjectId=${subjectId}`],
    enabled: !!subjectId,
  });

  const size = 560;
  const positioned = useMemo(() => layout(graph?.nodes || [], size), [graph]);
  const byId = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);

  const subjectName = subjects.find((s) => String(s.id) === subjectId)?.name;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display text-2xl text-foreground">Knowledge map</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each star is a concept. Dim means unseen, gold means close to mastered.
          </p>
        </div>
        {subjects.length > 0 ? (
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : null}
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium text-foreground">No subjects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Upload a study material and pick a subject to start building a map.</p>
          <a href="/materials/new" className="mt-4 inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Upload material
          </a>
        </div>
      ) : isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !graph || graph.nodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-indigo-300" />
          <p className="font-medium text-foreground">No concepts in {subjectName || "this subject"} yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a material for this subject and generate flashcards, concepts fill in automatically.
          </p>
          <a
            href={`/materials/new?subjectId=${subjectId}`}
            className="mt-4 inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Upload material
          </a>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-xl">
            {graph.edges.map((e, i) => {
              const a = byId.get(e.a);
              const b = byId.get(e.b);
              if (!a || !b) return null;
              const opacity = Math.min(0.55, 0.15 + e.weight * 0.12);
              const width = Math.min(3, 1 + e.weight * 0.4);
              return (
                <line
                  key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={masteryColor((a.mastery + b.mastery) / 2)}
                  strokeOpacity={opacity}
                  strokeWidth={width}
                />
              );
            })}
            {positioned.map((node) => {
              const r = 6 + node.mastery * 5;
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label}, ${Math.round(node.mastery * 100)} percent mastered, open its cards`}
                  className="cursor-pointer"
                  onClick={() => setLocation(`/flashcards?conceptId=${node.id}&label=${encodeURIComponent(node.label)}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setLocation(`/flashcards?conceptId=${node.id}&label=${encodeURIComponent(node.label)}`);
                  }}
                >
                  <circle cx={node.x} cy={node.y} r={r + 8} fill={masteryColor(node.mastery)} opacity={0.14} />
                  <circle cx={node.x} cy={node.y} r={r} fill={masteryColor(node.mastery)} />
                  <text
                    x={node.x}
                    y={node.y + r + 14}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    style={{ fontSize: 10 }}
                  >
                    {node.label.length > 16 ? `${node.label.slice(0, 15)}…` : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
