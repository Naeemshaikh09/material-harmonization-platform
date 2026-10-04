import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CornerDownLeft, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { Attributes, AttrKey, ReviewDetail, ReviewListItem, ReviewReason, Verdict } from "../lib/types";
import { CRITICAL_KEYS } from "../lib/types";
import { cn } from "../lib/format";
import {
  Button,
  Card,
  CodeDisplay,
  EmptyState,
  Kbd,
  SectionTitle,
  Skeleton,
  StatusChip,
} from "../components/ui/Primitives";
import { ComparisonGrid } from "../components/domain/Domain";
import { useToast } from "../state/ToastContext";
import { useAuth } from "../state/AuthContext";

const REASON_TONE: Record<ReviewReason, "conflict" | "unknown" | "ink" | "match"> = {
  CONFLICT: "conflict",
  INCOMPLETE: "unknown",
  LOW_CONFIDENCE: "unknown",
  FUNCTIONAL_EQUIV: "ink",
};

export default function Workbench() {
  const { user } = useAuth();
  const { success, error: toastError, push } = useToast();
  const [queue, setQueue] = useState<ReviewListItem[] | null>(null);
  const [filter, setFilter] = useState<"ALL" | ReviewReason>("ALL");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [corrections, setCorrections] = useState<Attributes>({});
  const [donePanel, setDonePanel] = useState<{ result: string; cmc?: string } | null>(null);

  const refresh = async () => {
    const r = await api.listReviews();
    setQueue(r.items);
    return r.items;
  };

  useEffect(() => {
    refresh().then((items) => {
      if (items.length > 0) setSelected(items[0].task_id);
    });
  }, []);

  useEffect(() => {
    if (selected == null) return;
    setDetail(null);
    setEditing(false);
    setCorrections({});
    setDonePanel(null);
    api.getReview(selected).then(setDetail).catch(() => setDetail(null));
  }, [selected]);

  const filtered = useMemo(
    () => (queue ?? []).filter((r) => filter === "ALL" || r.reason === filter),
    [queue, filter],
  );

  const criticalConflicts = useMemo(() => {
    if (!detail) return [] as AttrKey[];
    return CRITICAL_KEYS.filter((k) => detail.comparison[k] === "CONFLICT");
  }, [detail]);

  const anyCriticalBlocked = criticalConflicts.length > 0;
  const needsApprover = detail?.reason === "FUNCTIONAL_EQUIV" && user?.role !== "APPROVER" && user?.role !== "ADMIN";

  // ---- keyboard: J/K navigate, A approve, R reject, C correct ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = filtered.findIndex((r) => r.task_id === selected);
      if (e.key === "j" || e.key === "J") {
        const next = filtered[Math.min(filtered.length - 1, idx + 1)];
        if (next) setSelected(next.task_id);
      } else if (e.key === "k" || e.key === "K") {
        const prev = filtered[Math.max(0, idx - 1)];
        if (prev) setSelected(prev.task_id);
      } else if ((e.key === "c" || e.key === "C") && detail && !anyCriticalBlocked === false) {
        setEditing(true);
      } else if (e.key === "c" || e.key === "C") {
        setEditing(true);
      } else if ((e.key === "a" || e.key === "A") && detail && !anyCriticalBlocked && !needsApprover) {
        e.preventDefault();
        decide({ action: "APPROVE" });
      } else if (e.key === "r" || e.key === "R" && detail) {
        decide({ action: "REJECT" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selected, detail, anyCriticalBlocked, needsApprover]);

  const decide = async (req: { action: "APPROVE" | "REJECT" | "NEW" | "CORRECT"; corrections?: Attributes }) => {
    if (!detail) return;
    setBusy(true);
    try {
      const r = await api.decide(detail.task_id, req);
      setDonePanel({ result: r.result, cmc: r.cmc });
      success(
        r.result === "LINKED"
          ? `Linked to ${r.cmc}`
          : r.result === "NEW_CMC"
            ? `New CMC created ${r.cmc}`
            : r.result === "REJECTED"
              ? "Candidate rejected"
              : "Recorded",
        `Audit entry #${r.audit_id} written to the hash chain.`,
      );
      await refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toastError("Approval refused — critical conflict", e.message);
        push("info", "Safety rule active", "Wrong merges are worse than duplicates. Use Correct or Create new.");
      } else {
        toastError(e instanceof ApiError ? e.message : "Decision failed");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[310px_1fr] gap-5 items-start">
      {/* ================= Queue ================= */}
      <Card pad={false} className="overflow-hidden lg:sticky lg:top-[76px]">
        <div className="px-4 pt-4 pb-2.5 border-b border-line">
          <div className="flex items-center justify-between">
            <SectionTitle>Review queue</SectionTitle>
            <span className="num text-[11px] text-ink-2">{queue?.length ?? 0} open</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "CONFLICT", "INCOMPLETE", "LOW_CONFIDENCE", "FUNCTIONAL_EQUIV"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "chip cursor-pointer",
                  filter === f ? "bg-ink text-paper border-ink" : "bg-surface-2 text-ink-2 border-line hover:border-ink/30",
                )}
              >
                {f === "ALL" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {queue === null && (
            <div className="p-4 space-y-2.5">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          )}
          {queue !== null && filtered.length === 0 && (
            <EmptyState title="Queue is clear" body="Every task has a decision. New items arrive with the next batch." />
          )}
          {filtered.map((r) => (
            <button
              key={r.task_id}
              onClick={() => setSelected(r.task_id)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-line transition-colors duration-150",
                selected === r.task_id ? "bg-surface-2" : "hover:bg-surface-2/60",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="num text-[11px] font-bold text-ink-2">#{r.task_id}</span>
                <StatusChip tone={REASON_TONE[r.reason]}>{r.reason.replace("_", " ")}</StatusChip>
                {r.level === "L2" && (
                  <span className="text-[9px] font-bold uppercase tracking-label text-ink-3 border border-line-strong rounded px-1 py-px">
                    L2
                  </span>
                )}
                <span className="ml-auto flex gap-0.5" title={`Priority ${r.priority}`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={cn("w-1 h-1 rounded-full", i < r.priority ? "bg-ink" : "bg-line-strong")}
                    />
                  ))}
                </span>
              </div>
              <p className="text-[11.5px] text-ink-2 mt-1.5 line-clamp-2 leading-snug">“{r.raw.description}”</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="mono text-[10px] text-ink-3">
                  {r.raw.cpse}/{r.raw.code}
                </span>
                {r.candidate_cmc && <span className="text-[10px] text-ink-3 truncate">→ candidate linked</span>}
              </div>
            </button>
          ))}
        </div>
        {/* keyboard legend */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-line bg-surface-2/60 text-[10px] text-ink-3">
          <span className="flex items-center gap-1">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>A</Kbd> approve
          </span>
          <span className="flex items-center gap-1">
            <Kbd>C</Kbd> correct
          </span>
          <span className="flex items-center gap-1">
            <Kbd>R</Kbd> reject
          </span>
        </div>
      </Card>

      {/* ================= Detail ================= */}
      <div className="space-y-4 min-w-0">
        {detail === null && (
          <Card>
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-64" />
          </Card>
        )}

        {detail && (
          <>
            <Card>
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-[19px] font-bold tracking-tight text-ink">Review #{detail.task_id}</h2>
                    <StatusChip tone={REASON_TONE[detail.reason]}>{detail.reason.replace("_", " ")}</StatusChip>
                    <StatusChip tone="ink" dot={false}>
                      {detail.level} · priority {detail.priority}
                    </StatusChip>
                  </div>
                  <p className="text-[14px] text-ink leading-relaxed mt-2.5">
                    Original text: <span className="bg-surface-2 border border-line rounded-md px-2 py-0.5 mono text-[12.5px]">“{detail.raw.description}”</span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11.5px] text-ink-2">
                    <span className="mono">
                      {detail.raw.cpse} / {detail.raw.code}
                    </span>
                    <span className="text-ink-3">·</span>
                    <span>
                      model <span className="mono">{detail.model_version}</span>
                    </span>
                    <span className="text-ink-3">·</span>
                    <span>template v{detail.template_version}</span>
                  </div>
                </div>
                {detail.candidate && (
                  <div className="text-right">
                    <div className="label !text-[9px] mb-1.5">Candidate</div>
                    <CodeDisplay code={detail.candidate.cmc} />
                  </div>
                )}
              </div>

              {/* Decision state banner */}
              {anyCriticalBlocked && !editing && (
                <div className="mt-4 flex items-start gap-2.5 rounded-control border border-conflict/30 bg-conflict-bg px-3.5 py-2.5">
                  <X className="w-4 h-4 text-conflict mt-0.5 shrink-0" />
                  <p className="text-[12px] text-conflict leading-relaxed">
                    <strong>Critical conflict{criticalConflicts.length > 1 ? "s" : ""}:</strong>{" "}
                    {criticalConflicts.map((k) => k.replace("_", " ")).join(", ")} — approval is blocked by design.
                    Correct the value or create a separate CMC.
                  </p>
                </div>
              )}
              {needsApprover && (
                <div className="mt-4 flex items-center gap-2.5 rounded-control border border-line bg-surface-2 px-3.5 py-2.5">
                  <span className="text-[12px] text-ink-2">
                    Functional equivalence is an <strong>L2 decision</strong> — switch to the Approver role to sign off.
                  </span>
                </div>
              )}
            </Card>

            <Card>
              <SectionTitle
                right={
                  !donePanel ? (
                    <span className="text-[10.5px] text-ink-3">per-attribute comparison · critical rows marked</span>
                  ) : undefined
                }
              >
                Attribute comparison
              </SectionTitle>
              <ComparisonGrid
                extracted={detail.extracted}
                candidate={detail.candidate?.attributes ?? {}}
                comparison={
                  editing && detail
                    ? (() => {
                        // live preview of corrections in the grid
                        const merged: Partial<Record<AttrKey, Verdict>> = { ...detail.comparison };
                        Object.keys(corrections).forEach((k) => {
                          merged[k as AttrKey] = "MATCH";
                        });
                        return merged;
                      })()
                    : detail.comparison
                }
                editable={editing}
                corrections={corrections}
                onEdit={(k, value, unit) =>
                  setCorrections((c) => ({
                    ...c,
                    [k]: { value, unit, state: "KNOWN", confidence: 1 },
                  }))
                }
              />

              {/* Actions */}
              {!donePanel && (
                <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-4 border-t border-line">
                  {editing ? (
                    <>
                      <Button
                        disabled={busy}
                        onClick={() => decide({ action: "CORRECT", corrections })}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" /> Re-run decision
                          </>
                        )}
                      </Button>
                      <Button variant="secondary" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <span className="text-[11px] text-ink-2">
                        Corrections are recorded with your user in the audit entry.
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        title={
                          anyCriticalBlocked
                            ? "Blocked while a critical CONFLICT remains"
                            : needsApprover
                              ? "L2 approver role required"
                              : "Links the item to this CMC"
                        }
                      >
                        <Button
                          disabled={busy || anyCriticalBlocked || needsApprover}
                          onClick={() => decide({ action: "APPROVE" })}
                        >
                          <Check className="w-4 h-4" /> Approve & link
                        </Button>
                      </span>
                      <Button variant="secondary" disabled={busy} onClick={() => decide({ action: "REJECT" })}>
                        <X className="w-4 h-4" /> Reject candidate
                      </Button>
                      <Button variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
                        <RotateCcw className="w-4 h-4" /> Correct…
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={() => decide({ action: "NEW" })}>
                        <Plus className="w-4 h-4" /> Create new CMC
                      </Button>
                    </>
                  )}
                </div>
              )}

              {donePanel && (
                <div className="mt-5 rounded-control border border-match/30 bg-match-bg px-4 py-3.5 flex items-center gap-3 animate-fade-up">
                  <Check className="w-5 h-5 text-match shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-ink">
                      Decision recorded: {donePanel.result}
                      {donePanel.cmc && (
                        <>
                          {" "}
                          — <CodeDisplay code={donePanel.cmc} size="sm" />
                        </>
                      )}
                    </p>
                    <p className="text-[11.5px] text-ink-2 mt-0.5">
                      Crosswalk updated, audit entry written. Pick the next task in the queue
                      <CornerDownLeft className="w-3 h-3 inline mx-1" /> or press J.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
