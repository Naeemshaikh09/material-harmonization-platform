import type { ReactNode } from "react";
import { ArrowRight, CornerDownRight, FlaskConical, Sigma } from "lucide-react";
import type { Attributes, AttrKey, AttrValue, AuditRow, CmcDetail, Verdict } from "../../lib/types";
import { ATTR_LABELS, CRITICAL_KEYS } from "../../lib/types";
import { attrDisplay, cn, fmtInt, fmtINR, fmtTs, shortHash } from "../../lib/format";
import { CodeDisplay, ConfidenceBar, StatusChip, VerdictChip } from "../ui/Primitives";

// ===== Comparison grid (steward workbench) ==================================

export function ComparisonGrid({
  extracted,
  candidate,
  comparison,
  editable,
  corrections,
  onEdit,
  keys,
}: {
  extracted: Attributes;
  candidate: Attributes;
  comparison: Partial<Record<AttrKey, Verdict>>;
  editable?: boolean;
  corrections?: Attributes;
  onEdit?: (k: AttrKey, value: string, unit?: string) => void;
  keys?: AttrKey[];
}) {
  const rows = (keys ?? (Object.keys({ ...extracted, ...candidate }) as AttrKey[])).filter(
    (k) => extracted[k] || candidate[k],
  );

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className="label !text-[10px] pb-2.5 text-left border-b border-line w-[200px]">Dimension</th>
            <th className="label !text-[10px] pb-2.5 text-left border-b border-line">Incoming</th>
            <th className="label !text-[10px] pb-2.5 text-left border-b border-line">Golden candidate</th>
            <th className="label !text-[10px] pb-2.5 text-right border-b border-line w-[130px]">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const verdict = comparison[k] ?? "UNKNOWN";
            const critical = CRITICAL_KEYS.includes(k);
            const conflict = verdict === "CONFLICT";
            const inc = corrections?.[k] ?? extracted[k];
            return (
              <tr
                key={k}
                className={cn(
                  "table-row",
                  conflict && "bg-conflict-bg/50 hover:bg-conflict-bg/70",
                  critical && "border-l-[3px] border-l-ink/70",
                )}
              >
                <td className="py-2.5 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">{ATTR_LABELS[k]}</span>
                    {critical && (
                      <span className="text-[9px] font-bold uppercase tracking-label text-ink-3 border border-line-strong rounded px-1 py-px">
                        critical
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  {editable ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input !py-1.5 !text-[12.5px] max-w-[150px]"
                        defaultValue={inc?.state === "KNOWN" ? inc?.value : ""}
                        placeholder={attrDisplay(candidate[k])}
                        onChange={(e) => onEdit?.(k, e.target.value, inc?.unit)}
                        aria-label={`Correct ${ATTR_LABELS[k]}`}
                      />
                      {inc?.unit && <span className="text-[11px] text-ink-3">{inc.unit}</span>}
                    </div>
                  ) : (
                    <CellValue attr={inc} />
                  )}
                </td>
                <td className="py-2.5 pr-4">
                  <CellValue attr={candidate[k]} />
                </td>
                <td className="py-2.5 text-right">
                  <VerdictChip verdict={verdict} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({ attr }: { attr?: AttrValue }) {
  const state = attr?.state ?? "UNKNOWN";
  return (
    <div>
      <div
        className={cn(
          "text-[13px] font-medium",
          state === "NA" ? "text-na" : state === "UNKNOWN" ? "text-unknown" : "text-ink",
        )}
      >
        {attrDisplay(attr)}
      </div>
      {state === "KNOWN" && (attr?.confidence ?? 0) > 0 && (
        <div className="mt-1">
          <ConfidenceBar value={attr?.confidence} showPct={false} />
        </div>
      )}
      {attr?.source_span && state === "KNOWN" && (
        <div className="text-[10px] text-ink-3 mt-0.5 mono truncate max-w-[180px]">from “{attr.source_span}”</div>
      )}
    </div>
  );
}

// ===== Relationship tree ===================================================

export function RelationshipTree({ record }: { record: CmcDetail }) {
  return (
    <div className="space-y-0">
      <TreeNode label={<CodeDisplay code={record.code} size="sm" />} sub={`${record.class} · ${record.subclass}`} tone="root" />
      <div className="ml-[11px] border-l border-line-strong pl-6 space-y-0">
        {record.cpse_links.map((l) => (
          <TreeNode
            key={l.cpse + l.code}
            label={
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-ink">{l.cpse}</span>
                <code className="mono text-[12px] text-ink-2">{l.code}</code>
                <StatusChip tone={l.relationship === "EXACT" ? "match" : l.relationship === "PENDING" ? "unknown" : "ink"}>
                  {l.relationship}
                </StatusChip>
                <span className="text-[10px] text-ink-3 uppercase tracking-label">{l.decision_source}</span>
              </span>
            }
            sub={l.raw_description}
          />
        ))}
        {record.related.map((r) => (
          <TreeNode
            key={r.cmc}
            label={
              <span className="flex items-center gap-2 flex-wrap">
                <CodeDisplay code={r.cmc} size="sm" />
                <StatusChip tone={r.type === "NOT_EQUIVALENT" ? "conflict" : "unknown"}>
                  {r.type.replace(/_/g, " ")}
                </StatusChip>
                <span className="text-[10px] text-ink-3 uppercase tracking-label">{r.status}</span>
              </span>
            }
            sub={r.type === "NOT_EQUIVALENT" ? "Never share a CMC — safety rule" : "Engineer approval required"}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNode({
  label,
  sub,
  tone = "leaf",
}: {
  label: ReactNode;
  sub?: ReactNode;
  tone?: "root" | "leaf";
}) {
  return (
    <div className="relative flex items-start gap-2.5 pb-5">
      <CornerDownRight
        className={cn("w-4 h-4 mt-0.5 shrink-0", tone === "root" ? "text-ink" : "text-ink-3")}
      />
      <div className="min-w-0">
        {label}
        {sub && <div className="text-[11.5px] text-ink-2 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ===== Supersession banner =================================================

export function SupersessionBanner({ record }: { record: CmcDetail }) {
  if (record.status !== "SUPERSEDED" || !record.superseded_by) return null;
  return (
    <div className="flex items-center gap-3 flex-wrap rounded-card border border-unknown/35 bg-unknown-bg px-4 py-3">
      <StatusChip tone="unknown">SUPERSEDED</StatusChip>
      <span className="text-[13px] text-ink font-medium">
        This record was corrected and replaced. Crosswalks now point to:
      </span>
      <ArrowRight className="w-4 h-4 text-unknown" />
      <a href={`/golden/${record.superseded_by}`} className="hover:opacity-80 transition-opacity">
        <CodeDisplay code={record.superseded_by} size="sm" />
      </a>
    </div>
  );
}

// ===== Audit timeline ======================================================

export function AuditTimeline({ events }: { events: CmcDetail["history"] }) {
  return (
    <ol className="relative ml-2 border-l border-line-strong pl-5 space-y-4">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute -left-[26.5px] top-1.5 w-[9px] h-[9px] rounded-full border-2 border-surface",
              i === 0 ? "bg-ink" : "bg-line-strong",
            )}
          />
          <div className="text-[12.5px] font-semibold text-ink leading-tight">{e.action}</div>
          <div className="text-[11px] text-ink-2 mt-0.5">
            {fmtTs(e.ts)} · <span className="mono">{e.actor}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function AuditLogTable({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[780px] border-collapse">
        <thead>
          <tr>
            {["ID", "Time", "Actor", "Action", "Entity", "Hash", ""].map((h, i) => (
              <th key={i} className="label !text-[10px] pb-2.5 text-left border-b border-line">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="table-row">
              <td className="py-2.5 num text-[12px] text-ink-2">{r.id}</td>
              <td className="py-2.5 text-[12px] text-ink-2 whitespace-nowrap">{fmtTs(r.ts)}</td>
              <td className="py-2.5 mono text-[12px] text-ink">{r.actor}</td>
              <td className="py-2.5">
                <StatusChip tone={r.action.includes("CREATED") || r.action.includes("LINKED") ? "match" : "ink"}>
                  {r.action}
                </StatusChip>
              </td>
              <td className="py-2.5 mono text-[11.5px] text-ink-2">
                {r.entity}/{r.entity_id}
              </td>
              <td className="py-2.5 mono text-[11px] text-ink-3">{shortHash(r.hash)}</td>
              <td className="py-2.5">
                <a
                  href={`#audit-${r.id}`}
                  className="text-[11px] font-semibold text-ink-2 hover:text-ink underline underline-offset-2 decoration-line-strong"
                >
                  before/after
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== Synthetic / formula =================================================

export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-dashed border-unknown/50 bg-unknown-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-label text-unknown",
        className,
      )}
      title="Demo uses synthetic procurement figures — stated openly in the pitch."
    >
      <FlaskConical className="w-3 h-3" />
      Synthetic data
    </span>
  );
}

export function FormulaCard({ formula, explanation }: { formula: string; explanation: string }) {
  return (
    <div className="rounded-control border border-line bg-surface-2/80 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <Sigma className="w-3.5 h-3.5 text-ink-2" />
        <span className="label !text-[9.5px]">Formula (visible by design)</span>
      </div>
      <code className="mono block text-[12px] text-ink mt-1.5">{formula}</code>
      <p className="text-[11px] text-ink-2 mt-1.5 leading-relaxed">{explanation}</p>
    </div>
  );
}

// ===== Charts (hand-drawn SVG — zero chart dependency) =====================

export function BarChart({
  data,
  valueFmt = fmtInt,
  max,
}: {
  data: { label: string; value: number; sub?: string }[];
  valueFmt?: (n: number) => string;
  max?: number;
}) {
  const m = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-baseline justify-between text-[12px] mb-1.5">
            <span className="font-semibold text-ink">{d.label}</span>
            <span className="num text-ink-2">
              {valueFmt(d.value)}
              {d.sub && <span className="text-ink-3 ml-1.5">{d.sub}</span>}
            </span>
          </div>
          <div className="h-[8px] rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-ink/80 transition-all duration-700"
              style={{ width: `${Math.max(3, (d.value / m) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StackedBars({
  data,
}: {
  data: { label: string; segments: { value: number; color: string; name: string }[] }[];
}) {
  return (
    <div className="space-y-3.5">
      {data.map((d) => {
        const total = d.segments.reduce((a, b) => a + b.value, 0) || 1;
        return (
          <div key={d.label}>
            <div className="text-[12px] font-semibold text-ink mb-1.5">{d.label}</div>
            <div className="flex h-[10px] rounded-full overflow-hidden bg-surface-3 gap-[2px]">
              {d.segments.map((s, i) => (
                <div
                  key={i}
                  title={`${s.name}: ${fmtInt(s.value)}`}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                  style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {d.segments.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-[10.5px] text-ink-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.name} <span className="num text-ink-3">{fmtInt(s.value)}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({
  points,
  color = "#1A1815",
}: {
  points: number[];
  color?: string;
}) {
  const w = 120;
  const h = 32;
  const m = Math.max(...points, 1);
  const step = w / (points.length - 1 || 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (p / m) * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible opacity-80" aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MiniMeter({ label, value, total }: { label: string; value: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11.5px] text-ink-2 mb-1">
        <span>{label}</span>
        <span className="num">
          {fmtInt(value)} <span className="text-ink-3">/ {fmtInt(total)}</span>
        </span>
      </div>
      <div className="h-[6px] rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-match/80 transition-all duration-700"
          style={{ width: `${Math.min(100, (value / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function PriceRow({ cpse, qty, price, minPrice }: { cpse: string; qty: number; price: number; minPrice: number }) {
  const over = price - minPrice;
  return (
    <tr className="table-row">
      <td className="py-2.5 mono text-[12px] text-ink">{cpse}</td>
      <td className="py-2.5 num text-[12.5px] text-ink text-right">{fmtInt(qty)}</td>
      <td className="py-2.5 num text-[12.5px] text-ink text-right">{fmtINR(price)}</td>
      <td className="py-2.5 text-right">
        {over > 0 ? (
          <span className="num text-[12px] font-semibold text-unknown">+{fmtINR(over)}</span>
        ) : (
          <StatusChip tone="match">best</StatusChip>
        )}
      </td>
    </tr>
  );
}
