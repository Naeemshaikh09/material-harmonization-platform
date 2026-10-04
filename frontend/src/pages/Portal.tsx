import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Plus,
  Search,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { AttrKey, BatchStatus, CheckResponse, MyItem } from "../lib/types";
import { ATTR_LABELS, CRITICAL_KEYS } from "../lib/types";
import { cn, downloadCSV, fmtInt } from "../lib/format";
import {
  AttributeBadge,
  Button,
  Card,
  CodeDisplay,
  ConfidenceBar,
  EmptyState,
  Input,
  Kbd,
  SectionTitle,
  Skeleton,
  StatusChip,
  Tabs,
  VerdictChip,
} from "../components/ui/Primitives";
import { DataTable } from "../components/ui/Data";
import type { Column } from "../components/ui/Data";
import { useToast } from "../state/ToastContext";

const EXAMPLES = [
  { text: "BALL VLV 2 IN 150# SS316 FLG", label: "Existing valve" },
  { text: "VLV BALL DN50 CL150 SS316 WELDED", label: "New — welded end" },
  { text: "GATE VALVE 4 IN", label: "Needs info" },
];

export default function Portal() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "check";
  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          { id: "check", label: "Search-Before-Create" },
          { id: "upload", label: "Upload" },
          { id: "items", label: "My items" },
        ]}
        active={tab}
        onChange={(id) => setParams({ tab: id })}
      />
      {tab === "check" && <CheckTab />}
      {tab === "upload" && <UploadTab />}
      {tab === "items" && <ItemsTab />}
    </div>
  );
}

// ===========================================================================
// TAB 1 — Search-Before-Create (the hero)
// ===========================================================================

function CheckTab() {
  const { push, success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [text, setText] = useState("BALL VLV 2 IN 150# SS316 FLG");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [extra, setExtra] = useState<Partial<Record<AttrKey, string>>>({});
  const [requesting, setRequesting] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const run = async (t: string) => {
    if (!t.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await api.check(t, 1, "EA");
      setResult(r);
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : "Check failed");
    } finally {
      setBusy(false);
    }
  };

  const requestNew = async () => {
    setRequesting(true);
    try {
      const r = await api.requestNew(text, 1, "NEW-CODE", "EA");
      if (r.outcome === "NEW_CMC" && r.cmc) {
        success("New CMC issued", r.cmc);
        push("info", "Recorded in audit chain", "Crosswalk updated for your CPSE code.");
      } else {
        push("info", "Sent to review", `Review task #${r.review_task_id} — a steward will decide.`);
      }
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : "Request failed");
    } finally {
      setRequesting(false);
    }
  };

  const fillMissingAndRecheck = () => {
    let t = text;
    Object.entries(extra).forEach(([k, v]) => {
      if (v) t += ` ${v}`;
    });
    setText(t);
    run(t);
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden card p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(26,24,21,0.06) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative">
          <h2 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.02em] text-ink leading-tight">
            Search before you create.
          </h2>
          <p className="text-[13.5px] text-ink-2 mt-2 max-w-xl leading-relaxed">
            Paste a raw item description. The pipeline cleans, extracts and looks up the golden
            master <em>before</em> a new code can exist — duplicates stop at the door.
          </p>

          <div className="mt-5 rounded-card border border-line-strong bg-surface shadow-card p-2 focus-within:shadow-focus transition-shadow">
            <textarea
              ref={taRef}
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(text);
              }}
              placeholder='Type or paste item description — e.g. BALL VLV 2 IN 150# SS316 FLG'
              className="w-full resize-none bg-transparent px-3 pt-2 pb-1 text-[15px] text-ink placeholder:text-ink-3 outline-none"
            />
            <div className="flex items-center gap-2 px-2 pb-1.5">
              <span className="text-[10.5px] text-ink-3 hidden sm:flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd> to check
              </span>
              <button
                className="btn-primary ml-auto !h-10"
                disabled={busy || !text.trim()}
                onClick={() => run(text)}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Check
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            <span className="text-[10.5px] uppercase tracking-label text-ink-3 font-semibold mr-1">Try</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.text}
                onClick={() => {
                  setText(ex.text);
                  run(ex.text);
                }}
                className="chip border-line-strong bg-surface-2 text-ink-2 hover:border-ink/35 hover:text-ink transition-colors cursor-pointer"
              >
                {ex.label}
                <span className="mono text-[10px] text-ink-3">{ex.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {busy && (
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4">
          <Card>
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-8 w-3/4" />
          </Card>
          <Card>
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </Card>
        </div>
      )}

      {!busy && result && (
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-4 animate-fade-up">
          {/* Standardized description */}
          <Card>
            <SectionTitle>Standardized description</SectionTitle>
            {result.standard_description.draft && (
              <StatusChip tone="unknown" className="mb-3">
                DRAFT — critical fields missing
              </StatusChip>
            )}
            <p className="mono text-[14px] leading-relaxed text-ink bg-surface-2 rounded-control border border-line p-3.5">
              {result.standard_description.short}
            </p>
            <p className="text-[12.5px] text-ink-2 mt-2.5 leading-relaxed">{result.standard_description.long}</p>
            <div className="label !text-[9.5px] mt-5 mb-2.5">Extracted attributes</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(result.attributes) as AttrKey[])
                .slice(0, 9)
                .map((k) => (
                  <AttributeBadge key={k} label={ATTR_LABELS[k]} attr={result.attributes[k]} compact />
                ))}
            </div>
          </Card>

          {/* Outcome */}
          <div className="space-y-4">
            {result.outcome === "EXISTING" && result.match && (
              <Card className="border-match/35">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-match" />
                  <h3 className="text-[16px] font-bold text-ink">Existing material found</h3>
                </div>
                <p className="text-[12.5px] text-ink-2 mt-1.5">
                  This item already has a Common Material Code. Linking keeps your code untouched.
                </p>
                <div className="mt-4">
                  <CodeDisplay code={result.match.cmc} size="lg" />
                </div>
                <div className="label !text-[9.5px] mt-5 mb-2">Already linked from</div>
                <div className="space-y-1.5">
                  {result.match.linked_cpse_codes.map((l) => (
                    <div key={l.cpse + l.code} className="flex items-center gap-2 text-[12px]">
                      <StatusChip tone="match" dot={false}>
                        {l.cpse}
                      </StatusChip>
                      <code className="mono text-ink-2">{l.code}</code>
                    </div>
                  ))}
                </div>
                <div className="label !text-[9.5px] mt-5 mb-2">Evidence</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(result.match.evidence).map(([k, v]) => (
                    <VerdictChip key={k} verdict={v} />
                  ))}
                </div>
                <div className="flex gap-2.5 mt-6">
                  <Button onClick={() => navigate(`/golden/${result.match!.cmc}`)}>
                    Open golden record <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => push("info", "Marked as different", "A steward will confirm before any new CMC.")}
                  >
                    Not the same material
                  </Button>
                </div>
              </Card>
            )}

            {result.outcome === "NEEDS_INFO" && (
              <Card className="border-unknown/35">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-unknown" />
                  <h3 className="text-[16px] font-bold text-ink">Needs a bit more information</h3>
                </div>
                <p className="text-[12.5px] text-ink-2 mt-1.5">
                  Identity depends on critical dimensions. Fill these and we check again — we never
                  guess and silently create a code.
                </p>
                <div className="space-y-3 mt-4">
                  {result.missing_critical.map((k) => (
                    <div key={k}>
                      <label className="label !text-[9.5px] block mb-1.5">
                        {ATTR_LABELS[k]} <span className="text-unknown">· critical</span>
                      </label>
                      <Input
                        placeholder={`e.g. ${k === "pressure" ? "150 (CLASS)" : k === "material" ? "SS316" : "FLANGED"}`}
                        value={extra[k] ?? ""}
                        onChange={(e) => setExtra((x) => ({ ...x, [k]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <Button className="mt-4" onClick={fillMissingAndRecheck}>
                  Re-check with these values
                </Button>
              </Card>
            )}

            {result.outcome === "NO_MATCH" && (
              <Card>
                <div className="flex items-center gap-2.5">
                  <Plus className="w-5 h-5 text-ink" />
                  <h3 className="text-[16px] font-bold text-ink">No matching material</h3>
                </div>
                <p className="text-[12.5px] text-ink-2 mt-1.5">
                  All critical attributes are known and nothing in the golden master matches.
                  That is exactly when a new CMC is safe to request.
                </p>

                {result.similar.length > 0 && (
                  <>
                    <div className="label !text-[9.5px] mt-5 mb-2">Closest records — double-check these</div>
                    <div className="space-y-2">
                      {result.similar.map((s) => (
                        <button
                          key={s.cmc}
                          onClick={() => navigate(`/golden/${s.cmc}`)}
                          className="w-full text-left rounded-control border border-line bg-surface-2/60 px-3.5 py-2.5 hover:border-ink/30 transition-colors"
                        >
                          <CodeDisplay code={s.cmc} size="sm" />
                          <div className="text-[11.5px] text-ink-2 mt-1.5">{s.description}</div>
                          <div className="mt-1.5">
                            <ConfidenceBar value={s.score} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <Button className="mt-5" disabled={requesting} onClick={requestNew}>
                  {requesting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Request new CMC <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </Card>
            )}
          </div>
        </div>
      )}

      {!busy && !result && (
        <Card pad={false}>
          <EmptyState
            icon={<Search className="w-7 h-7" />}
            title="No check run yet"
            body="Paste a description above or try one of the examples. Every request runs the same
            pipeline: clean → extract → canonicalize → lookup → decide."
          />
        </Card>
      )}
    </div>
  );
}

// ===========================================================================
// TAB 2 — Upload (dropzone → mapping → progress)
// ===========================================================================

type Phase = "drop" | "map" | "run";

function UploadTab() {
  const { success, error: toastError, push } = useToast();
  const [phase, setPhase] = useState<Phase>("drop");
  const [filename, setFilename] = useState("");
  const [drag, setDrag] = useState(false);
  const [detected, setDetected] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<BatchStatus | null>(null);

  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(async () => {
      const b = await api.getBatch(12);
      setBatch(b);
      if (b.status === "DONE") {
        clearInterval(t);
        success("Batch complete", `${fmtInt(b.counts.linked)} linked · ${fmtInt(b.counts.new_cmc)} new CMC · ${b.counts.pending_review} for review`);
      }
    }, 450);
    return () => clearInterval(t);
  }, [phase, success]);

  const start = async () => {
    try {
      await api.startBatch(12, mapping);
      setPhase("run");
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : "Could not start batch");
    }
  };

  const pick = async (name: string) => {
    setFilename(name);
    try {
      const r = await api.createBatch(name);
      setDetected(r.detected_columns);
      setMapping(r.suggested_mapping);
      setPhase("map");
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Stepper strip */}
      <div className="flex items-center gap-2 text-[11.5px]">
        {(["drop", "map", "run"] as Phase[]).map((p, i) => {
          const idx = ["drop", "map", "run"].indexOf(phase);
          return (
            <div key={p} className="flex items-center gap-2">
              <span
                className={cn(
                  "w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10.5px] font-bold border",
                  i < idx ? "bg-ink text-paper border-ink" : i === idx ? "bg-surface border-ink text-ink" : "bg-surface-2 border-line-strong text-ink-3",
                )}
              >
                {i < idx ? "✓" : i + 1}
              </span>
              <span className={cn("font-semibold", i <= idx ? "text-ink" : "text-ink-3")}>
                {p === "drop" ? "Select file" : p === "map" ? "Map columns" : "Process"}
              </span>
              {i < 2 && <ArrowRight className="w-3.5 h-3.5 text-ink-3" />}
            </div>
          );
        })}
      </div>

      {phase === "drop" && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            pick(f?.name ?? "catalog.xlsx");
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-16 cursor-pointer transition-all duration-150",
            drag ? "border-ink bg-surface-2" : "border-line-strong bg-surface hover:border-ink/40",
          )}
        >
          <input
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0].name)}
          />
          <div className="w-12 h-12 rounded-full bg-surface-2 border border-line flex items-center justify-center">
            <UploadIcon className="w-5 h-5 text-ink-2" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-ink">
              Drop a CSV or Excel export here
            </p>
            <p className="text-[12px] text-ink-2 mt-1">
              SAP / Oracle exports welcome — you map the columns next. Raw rows are stored untouched.
            </p>
          </div>
          <span className="btn-secondary mt-1" aria-hidden>
            <FileSpreadsheet className="w-4 h-4" /> Browse files
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              pick("catalog_valves_q3.csv");
            }}
            className="text-[11.5px] text-ink-2 underline underline-offset-2 decoration-line-strong hover:text-ink"
          >
            or load the demo file (5,000 rows)
          </button>
        </label>
      )}

      {phase === "map" && (
        <Card>
          <SectionTitle
            right={
              <StatusChip tone="unknown">
                {detected.length} columns detected in {filename}
              </StatusChip>
            }
          >
            Confirm column mapping
          </SectionTitle>
          <p className="text-[12.5px] text-ink-2 mb-4">
            Suggestions come from header names. Fix anything wrong — the pipeline records this
            mapping with the batch for audit.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { field: "cpse_code", label: "CPSE code" },
              { field: "description", label: "Description" },
              { field: "uom", label: "Unit of measure" },
            ].map((f) => (
              <div key={f.field}>
                <label className="label !text-[10px] block mb-1.5">{f.label}</label>
                <select
                  className="input appearance-none cursor-pointer"
                  value={mapping[f.field] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.field]: e.target.value }))}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236C6459' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                    backgroundPosition: "right 12px center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <option value="">— skip —</option>
                  {detected.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {mapping[f.field] && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10.5px] text-match font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> suggested match
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2.5 mt-6">
            <Button onClick={start}>Start processing</Button>
            <Button variant="secondary" onClick={() => setPhase("drop")}>
              Choose another file
            </Button>
          </div>
        </Card>
      )}

      {phase === "run" && batch && (
        <Card>
          <SectionTitle
            right={
              batch.status === "DONE" ? (
                <StatusChip tone="match">DONE</StatusChip>
              ) : (
                <StatusChip tone="unknown">
                  <Loader2 className="w-3 h-3 animate-spin" /> RUNNING
                </StatusChip>
              )
            }
          >
            Batch #{batch.batch_id} · {filename || "catalog_valves_q3.csv"}
          </SectionTitle>

          <div className="flex items-baseline gap-3">
            <span className="num text-[28px] font-bold tracking-tight text-ink">
              {fmtInt(batch.processed)}
            </span>
            <span className="num text-[13px] text-ink-2">/ {fmtInt(batch.total_rows)} rows</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-3 overflow-hidden mt-2.5">
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${(batch.processed / batch.total_rows) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {[
              { label: "Linked", v: batch.counts.linked, tone: "match" as const },
              { label: "New CMC", v: batch.counts.new_cmc, tone: "ink" as const },
              { label: "Pending review", v: batch.counts.pending_review, tone: "unknown" as const },
              { label: "Conflict", v: batch.counts.conflict, tone: "conflict" as const },
              { label: "Error", v: batch.counts.error, tone: "na" as const },
            ].map((c) => (
              <div key={c.label} className="rounded-control border border-line bg-surface-2/60 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background:
                        c.tone === "match" ? "#15803D" : c.tone === "conflict" ? "#B42318" : c.tone === "unknown" ? "#B45309" : c.tone === "na" ? "#A29B92" : "#1A1815",
                    }}
                  />
                  <span className="label !text-[9px]">{c.label}</span>
                </div>
                <div className="num text-[19px] font-bold text-ink mt-1">{fmtInt(c.v)}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-5 text-[12px] text-ink-2">
            <Info className="w-3.5 h-3.5 text-ink-3" />
            Data quality: {batch.data_quality.blank_descriptions} blank descriptions ·{" "}
            {batch.data_quality.duplicate_cpse_codes} duplicate CPSE codes (kept in raw for audit)
          </div>

          {batch.status === "DONE" && (
            <div className="flex gap-2.5 mt-5">
              <Button
                variant="secondary"
                onClick={() =>
                  push("success", "Crosswalk exported", "CSV download includes raw code → CMC mapping.")
                }
              >
                <Download className="w-4 h-4" /> Export crosswalk
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ===========================================================================
// TAB 3 — My items
// ===========================================================================

function ItemsTab() {
  const [items, setItems] = useState<MyItem[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    api.myItems().then(setItems);
  }, []);

  const rows = (items ?? []).filter((i) => filter === "ALL" || i.status === filter);

  const columns: Column<MyItem>[] = [
    {
      key: "code",
      label: "CPSE code",
      render: (r) => <code className="mono text-[12px] text-ink">{r.cpse_code}</code>,
    },
    { key: "desc", label: "Raw description", render: (r) => <span className="text-ink-2">{r.description}</span> },
    {
      key: "cmc",
      label: "CMC",
      render: (r) => (r.cmc ? <CodeDisplay code={r.cmc} size="sm" /> : <span className="text-ink-3 text-[12px]">—</span>),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusChip
          tone={r.status === "LINKED" ? "match" : r.status === "CONFLICT" ? "conflict" : r.status === "PENDING_REVIEW" ? "unknown" : "ink"}
        >
          {r.status.replace("_", " ")}
        </StatusChip>
      ),
    },
    { key: "batch", label: "Source", render: (r) => <span className="mono text-[11px] text-ink-3">{r.batch}</span> },
  ];

  return (
    <Card>
      <SectionTitle
        right={
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input !py-1.5 !text-[12px] !w-auto cursor-pointer"
            >
              {["ALL", "LINKED", "NEW_CMC", "PENDING_REVIEW", "CONFLICT"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              className="!h-8 !px-3 !text-[12px]"
              onClick={() =>
                downloadCSV("crosswalk_export.csv", [
                  ["cpse_code", "description", "cmc", "status", "source"],
                  ...rows.map((r) => [r.cpse_code, r.description, r.cmc ?? "", r.status, r.batch]),
                ])
              }
            >
              <Download className="w-3.5 h-3.5" /> Export crosswalk
            </Button>
          </div>
        }
      >
        My items
      </SectionTitle>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.cpse_code}
        emptyTitle="No items with this filter"
        emptyBody="Upload a catalogue or run a Search-Before-Create check to see items here."
      />
    </Card>
  );
}
