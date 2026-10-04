import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/format";
import { EmptyState } from "./Primitives";

// ===== DataTable ===========================================================

export interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyBody,
  compact,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyBody?: string;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ width: c.width }}
                className={cn(
                  "label !text-[10px] pb-2.5 pt-1 border-b border-line",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn("table-row", onRowClick && "cursor-pointer")}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    compact ? "py-2" : "py-3",
                    "align-middle text-[13px] text-ink",
                    c.align === "right" && "text-right",
                  )}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===== Stepper =============================================================

export interface StepDef {
  id: string;
  label: string;
  caption?: string;
}

export function Stepper({
  steps,
  current,
  statusFor,
}: {
  steps: StepDef[];
  current: number;
  statusFor?: (i: number) => "done" | "active" | "pending" | "blocked";
}) {
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {steps.map((s, i) => {
        const st = statusFor ? statusFor(i) : i < current ? "done" : i === current ? "active" : "pending";
        return (
          <li key={s.id} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11.5px] font-bold border transition-colors",
                  st === "done" && "bg-ink text-paper border-ink",
                  st === "active" && "bg-surface text-ink border-ink shadow-focus",
                  st === "pending" && "bg-surface-2 text-ink-3 border-line-strong",
                  st === "blocked" && "bg-conflict-bg text-conflict border-conflict/40",
                )}
              >
                {st === "done" ? "✓" : i + 1}
              </span>
              <div className="mr-1">
                <div
                  className={cn(
                    "text-[12.5px] font-semibold leading-tight",
                    st === "pending" ? "text-ink-3" : "text-ink",
                  )}
                >
                  {s.label}
                </div>
                {s.caption && <div className="text-[10.5px] text-ink-3 leading-tight">{s.caption}</div>}
              </div>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-ink-3 mx-2 shrink-0" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ===== Pagination ==========================================================

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between pt-3 text-[12px] text-ink-2">
      <span className="num">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1.5">
        <button className="btn-secondary !h-8 !px-3 !text-[12px]" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <button className="btn-secondary !h-8 !px-3 !text-[12px]" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
