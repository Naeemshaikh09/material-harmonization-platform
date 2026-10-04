import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  GitCompare,
  Loader2,
  Plus,
  RotateCcw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import type {
  AdminUserRow,
  AuditRow,
  AuditVerifyResponse,
  CodeTable,
  DuplicateRow,
  DryRunReport,
  Role,
  TemplateRow,
  TerminologyRow,
} from "../lib/types";
import { cn, fmtInt, shortHash } from "../lib/format";
import {
  Button,
  Card,
  CodeDisplay,
  EmptyState,
  Input,
  Modal,
  SectionTitle,
  Skeleton,
  StatusChip,
  Tabs,
} from "../components/ui/Primitives";
import { DataTable, Stepper } from "../components/ui/Data";
import type { Column } from "../components/ui/Data";
import { AuditLogTable } from "../components/domain/Domain";
import { useToast } from "../state/ToastContext";
import { useAuth } from "../state/AuthContext";

export default function Admin() {
  const [tab, setTab] = useState("reference");
  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          { id: "reference", label: "Reference data" },
          { id: "migration", label: "Migration" },
          { id: "audit", label: "Audit chain" },
          { id: "users", label: "Users & CPSEs" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "reference" && <ReferenceData />}
      {tab === "migration" && <Migration />}
      {tab === "audit" && <AuditTab />}
      {tab === "users" && <Users />}
    </div>
  );
}

// ===========================================================================
// Reference data — terminology, templates (with version diff), code tables
// ===========================================================================

function ReferenceData() {
  const { success } = useToast();
  const [terms, setTerms] = useState<TerminologyRow[] | null>(null);
  const [tmpls, setTmpls] = useState<TemplateRow[] | null>(null);
  const [tables, setTables] = useState<CodeTable[] | null>(null);
  const [diffFor, setDiffFor] = useState<TemplateRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ term: "", replacement: "", kind: "ABBREVIATION" });

  const load = () => {
    api.terminology().then(setTerms);
    api.templates().then(setTmpls);
    api.codeTables().then(setTables);
  };
  useEffect(load, []);

  const activate = async (t: TemplateRow) => {
    await api.activateTemplate(t.id);
    success("Template activated", `${t.class_name} v${t.version + 1} is now the active version.`);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Terminology */}
      <Card>
        <SectionTitle
          right={
            <Button variant="secondary" className="!h-8 !px-3 !text-[12px]" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add term
            </Button>
          }
        >
          Terminology dictionary · versioned
        </SectionTitle>
        {!terms ? (
          <Skeleton className="h-40" />
        ) : (
          <DataTable
            compact
            columns={[
              { key: "t", label: "Term", render: (r: TerminologyRow) => <code className="mono text-[12px] font-bold text-ink">{r.term}</code> },
              { key: "r", label: "Replacement", render: (r: TerminologyRow) => <span className="text-[12.5px] text-ink-2">{r.replacement}</span> },
              {
                key: "k",
                label: "Kind",
                render: (r: TerminologyRow) => (
                  <StatusChip tone="ink" dot={false}>
                    {r.kind}
                  </StatusChip>
                ),
              },
              { key: "v", label: "Version", align: "right", render: (r: TerminologyRow) => <span className="num text-[12px] text-ink-2">v{r.version}</span> },
              {
                key: "s",
                label: "Status",
                render: (r: TerminologyRow) =>
                  r.active ? <StatusChip tone="match">active</StatusChip> : <StatusChip tone="na">retired</StatusChip>,
              },
            ]}
            rows={terms}
            rowKey={(r) => String(r.id)}
          />
        )}
      </Card>

      {/* Templates */}
      <Card>
        <SectionTitle right={<span className="text-[10.5px] text-ink-3">draft → activate is a versioned, audited action</span>}>
          Class templates
        </SectionTitle>
        {!tmpls ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="space-y-3">
            {tmpls.map((t) => (
              <div key={t.id} className="rounded-control border border-line px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <code className="mono text-[13px] font-bold text-ink">{t.class_code}</code>
                  <span className="text-[13.5px] font-semibold text-ink">{t.class_name}</span>
                  <StatusChip tone="ink" dot={false}>
                    v{t.version}
                  </StatusChip>
                  {t.status === "ACTIVE" ? (
                    <StatusChip tone="match">ACTIVE</StatusChip>
                  ) : t.status === "DRAFT" ? (
                    <StatusChip tone="unknown">DRAFT</StatusChip>
                  ) : (
                    <StatusChip tone="na">RETIRED</StatusChip>
                  )}
                  {t.validated_by ? (
                    <span className="text-[10.5px] text-ink-2 ml-1">validated by {t.validated_by}</span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-label text-unknown border border-unknown/40 rounded px-1.5 py-0.5">
                      unvalidated
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" className="!h-8 !px-2.5 !text-[11.5px]" onClick={() => setDiffFor(t)}>
                      <GitCompare className="w-3.5 h-3.5" /> Diff
                    </Button>
                    {t.status === "DRAFT" && (
                      <Button className="!h-8 !px-3 !text-[11.5px]" onClick={() => activate(t)}>
                        Activate v{t.version + 1}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {t.applicable.map((k) => (
                    <span
                      key={k}
                      className={cn(
                        "chip cursor-default",
                        t.critical.includes(k)
                          ? "bg-ink text-paper border-ink"
                          : "bg-surface-2 text-ink-2 border-line",
                      )}
                      title={t.critical.includes(k) ? "Critical dimension" : "Applicable dimension"}
                    >
                      {k.replace(/_/g, " ")}
                      {t.critical.includes(k) && " ★"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Code tables */}
      <Card>
        <SectionTitle right={<span className="text-[10.5px] text-ink-3">codes are never reused · 0000 reserved for n/a</span>}>
          Code tables
        </SectionTitle>
        {!tables ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {tables.map((tb) => (
              <div key={tb.name} className="rounded-control border border-line overflow-hidden">
                <div className="px-3.5 py-2 bg-surface-2 border-b border-line flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-ink-2" />
                  <code className="mono text-[12px] font-semibold text-ink">{tb.name}</code>
                </div>
                <table className="w-full border-collapse">
                  <tbody>
                    {tb.values.map((v) => (
                      <tr key={v.code} className="table-row">
                        <td className="py-2 px-3.5 mono text-[11.5px] text-ink-2 w-[70px]">{v.code}</td>
                        <td className="py-2 text-[12px] font-semibold text-ink">{v.label}</td>
                        <td className="py-2 text-[11.5px] text-ink-2">{v.canonical}</td>
                        <td className="py-2 px-3.5 text-right">
                          {v.status === "ACTIVE" ? (
                            <StatusChip tone="match">active</StatusChip>
                          ) : (
                            <StatusChip tone="na">retired</StatusChip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Version diff modal */}
      <Modal open={diffFor != null} onClose={() => setDiffFor(null)} title={`Template diff — ${diffFor?.class_name ?? ""}`}>
        {diffFor && (
          <div className="font-mono text-[12px] leading-relaxed rounded-control border border-line overflow-hidden">
            <div className="px-3.5 py-2 bg-surface-2 border-b border-line text-ink-2 text-[11px]">
              v{diffFor.version} → v{diffFor.version + 1}
            </div>
            <div className="p-3.5 space-y-1">
              <div className="text-match bg-match-bg rounded px-2 py-1">+ critical: connection added</div>
              <div className="text-conflict bg-conflict-bg rounded px-2 py-1">- allowed_values.temperature: [120, 180] removed</div>
              <div className="text-ink-2 px-2 py-1">
                {"  description_template: \"VALVE,{type},DN{primary_size},CL{pressure},{material},{connection}\""}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add term modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add dictionary term">
        <div className="space-y-3.5">
          <div>
            <label className="label !text-[10px] block mb-1.5">Term (as it appears in raw text)</label>
            <Input value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} placeholder="e.g. BSP" />
          </div>
          <div>
            <label className="label !text-[10px] block mb-1.5">Replacement (canonical)</label>
            <Input
              value={draft.replacement}
              onChange={(e) => setDraft({ ...draft, replacement: e.target.value })}
              placeholder="e.g. BRITISH STANDARD PIPE"
            />
          </div>
          <div>
            <label className="label !text-[10px] block mb-1.5">Kind</label>
            <select
              className="input cursor-pointer"
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            >
              {["ABBREVIATION", "UNIT", "RATING", "MATERIAL", "SYNONYM"].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>
          <Button
            disabled={!draft.term || !draft.replacement}
            onClick={async () => {
              await api.addTerminology(draft as TerminologyRow);
              success("Term added", "Version 1 created — active immediately.");
              setAddOpen(false);
              setDraft({ term: "", replacement: "", kind: "ABBREVIATION" });
              load();
            }}
          >
            Save term
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ===========================================================================
// Migration console — Extract → Dry run → Review → Publish → Verify
// ===========================================================================

function Migration() {
  const { success, error: toastError, push } = useToast();
  const [report, setReport] = useState<DryRunReport | null>(null);
  const [dups, setDups] = useState<DuplicateRow[] | null>(null);
  const [step, setStep] = useState(0); // 0 extract, 1 dry, 2 review, 3 publish, 4 verify
  const [verifyOut, setVerifyOut] = useState<{ reconciled: boolean; unmapped: number; sample_checked: number } | null>(null);
  const [confirm, setConfirm] = useState<null | "publish" | "rollback">(null);
  const [busy, setBusy] = useState(false);

  const dryRun = async () => {
    setBusy(true);
    try {
      const r = await api.migrationDryRun();
      setReport(r);
      setDups(await api.migrationDuplicates());
      setStep(2);
      push("info", "Dry run complete", "Nothing is written — review the report before publishing.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (what: "publish" | "verify" | "rollback") => {
    setBusy(true);
    try {
      if (what === "publish") {
        const r = await api.migrationPublish();
        setStep(4);
        success("Crosswalk published", `Version ${r.crosswalk_version} is live. Rollback keeps version 1.`);
      } else if (what === "verify") {
        const r = await api.migrationVerify();
        setVerifyOut(r);
        success("Verification passed", `${r.sample_checked} rows sampled · ${r.unmapped} unmapped.`);
      } else {
        await api.migrationRollback();
        setStep(2);
        success("Rolled back", "Crosswalk version 1 restored. CPSE codes were never touched.");
      }
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : "Migration action failed");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle right={<StatusChip tone="ink" dot={false}>CPSE_B · VALVE · batch #12</StatusChip>}>
          Migration console
        </SectionTitle>
        <Stepper
          current={step}
          steps={[
            { id: "ex", label: "Extract", caption: "raw rows staged" },
            { id: "dry", label: "Dry run", caption: "no writes" },
            { id: "rev", label: "Review", caption: "prioritised queue" },
            { id: "pub", label: "Publish", caption: "versioned crosswalk" },
            { id: "ver", label: "Verify", caption: "counts + sample" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-4 border-t border-line">
          {step < 2 && (
            <Button disabled={busy} onClick={dryRun}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />} Run dry run
            </Button>
          )}
          {step === 2 && (
            <>
              <Button disabled={busy} onClick={() => setConfirm("publish")}>
                Publish crosswalk v2
              </Button>
              <span className="text-[11px] text-ink-2">
                {report ? fmtInt(report.report.pending) : 0} pending items will stay pending — publish maps only decided rows.
              </span>
            </>
          )}
          {step >= 3 && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => run("verify")}>
                <ShieldCheck className="w-4 h-4" /> Verify counts & sample
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirm("rollback")}>
                <RotateCcw className="w-4 h-4" /> Rollback
              </Button>
            </>
          )}
        </div>
      </Card>

      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { l: "Total rows", v: report.report.total, tone: "ink" },
            { l: "Auto-linked", v: report.report.auto_linked, tone: "match" },
            { l: "New CMC", v: report.report.new_cmc, tone: "ink" },
            { l: "Pending", v: report.report.pending, tone: "unknown" },
            { l: "Conflict", v: report.report.conflict, tone: "conflict" },
            { l: "Intra-CPSE dupes", v: report.report.intra_cpse_duplicates, tone: "unknown" },
          ].map((c) => (
            <div key={c.l} className="card p-3.5">
              <div className="label !text-[9px]">{c.l}</div>
              <div
                className="num text-[21px] font-bold mt-1"
                style={{
                  color:
                    c.tone === "match" ? "#15803D" : c.tone === "conflict" ? "#B42318" : c.tone === "unknown" ? "#B45309" : "#1A1815",
                }}
              >
                {fmtInt(c.v)}
              </div>
            </div>
          ))}
        </div>
      )}

      {dups && (
        <Card>
          <SectionTitle right={<span className="text-[10.5px] text-ink-3">CPSE decides retirement — we only recommend</span>}>
            Intra-CPSE duplicates
          </SectionTitle>
          <DataTable
            compact
            columns={[
              {
                key: "pair",
                label: "Duplicate pair",
                render: (r: DuplicateRow) => (
                  <div className="flex items-center gap-2">
                    <code className="mono text-[11.5px] text-ink">{r.cpse_code_a}</code>
                    <span className="text-ink-3">↔</span>
                    <code className="mono text-[11.5px] text-ink">{r.cpse_code_b}</code>
                  </div>
                ),
              },
              { key: "d", label: "Description", render: (r: DuplicateRow) => <span className="text-[12px] text-ink-2">{r.description}</span> },
              {
                key: "keep",
                label: "Recommend keeping",
                render: (r: DuplicateRow) => <code className="mono text-[11.5px] font-semibold text-match">{r.keep}</code>,
              },
              { key: "why", label: "Reason", render: (r: DuplicateRow) => <span className="text-[11.5px] text-ink-2">{r.reason}</span> },
            ]}
            rows={dups}
            rowKey={(r) => r.cpse_code_a + r.cpse_code_b}
          />
        </Card>
      )}

      {verifyOut && (
        <Card className={cn(verifyOut.reconciled ? "border-match/35" : "border-conflict/35")}>
          <div className="flex items-center gap-3">
            {verifyOut.reconciled ? (
              <CheckCircle2 className="w-6 h-6 text-match" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-conflict" />
            )}
            <div>
              <p className="text-[14px] font-bold text-ink">
                {verifyOut.reconciled ? "Counts reconcile" : "Reconciliation failed"}
              </p>
              <p className="text-[12px] text-ink-2">
                {fmtInt(verifyOut.sample_checked)} rows sampled · {verifyOut.unmapped} unmapped
              </p>
            </div>
          </div>
        </Card>
      )}

      <Modal open={confirm != null} onClose={() => setConfirm(null)} title={confirm === "publish" ? "Publish crosswalk?" : "Rollback crosswalk?"}>
        <p className="text-[13px] text-ink-2 leading-relaxed">
          {confirm === "publish"
            ? "This writes crosswalk version 2 for decided rows only. CPSE codes are never modified — rollback simply restores version 1."
            : "Version 1 becomes active again. All links made in version 2 are recorded in the audit log before being reverted."}
        </p>
        <div className="flex gap-2.5 mt-5">
          <Button variant={confirm === "rollback" ? "danger" : "primary"} disabled={busy} onClick={() => run(confirm!)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : confirm === "publish" ? "Yes, publish" : "Yes, rollback"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ===========================================================================
// Audit — hash chain viewer + verify + anchor
// ===========================================================================

function AuditTab() {
  const { user } = useAuth();
  const { success, push } = useToast();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [verify, setVerify] = useState<AuditVerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [tamper, setTamper] = useState(false);

  useEffect(() => {
    api.auditLog().then(setRows);
  }, []);

  const runVerify = async () => {
    setBusy(true);
    setVerify(null);
    try {
      api.setTampered(tamper);
      const r = await api.auditVerify();
      setVerify(r);
      if (r.valid) success("Chain valid", `${r.checked} entries checked — every hash links.`);
      else
        push(
          "error",
          `Tamper detected at #${r.first_broken_id}`,
          "The chain stops here — entries after the break cannot be trusted.",
        );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          right={
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer select-none" title="Demo-only switch to show tamper detection">
                <input
                  type="checkbox"
                  checked={tamper}
                  onChange={(e) => setTamper(e.target.checked)}
                  className="accent-[#B42318] w-3.5 h-3.5"
                  disabled={user?.role !== "ADMIN" && user?.role !== "AUDITOR"}
                />
                <span className="text-[10.5px] uppercase tracking-label text-ink-3 font-semibold">
                  simulate tamper
                </span>
              </label>
              <Button
                variant="secondary"
                className="!h-9 !px-3.5 !text-[12.5px]"
                disabled={busy}
                onClick={runVerify}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify chain
              </Button>
              <Button
                className="!h-9 !px-3.5 !text-[12.5px]"
                onClick={async () => {
                  const r = await api.auditAnchor();
                  success("Hash anchored", r.location);
                }}
              >
                Anchor latest hash
              </Button>
            </div>
          }
        >
          Hash-chained audit log
        </SectionTitle>

        {verify && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-control border px-4 py-3 mb-4 animate-fade-up",
              verify.valid ? "border-match/35 bg-match-bg" : "border-conflict/35 bg-conflict-bg",
            )}
          >
            {verify.valid ? (
              <CheckCircle2 className="w-5 h-5 text-match" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-conflict" />
            )}
            <div>
              <p className="text-[13px] font-bold text-ink">
                {verify.valid
                  ? `Valid — ${verify.checked} entries verified`
                  : `Broken chain — first bad entry #${verify.first_broken_id}`}
              </p>
              <p className="text-[11.5px] text-ink-2">
                hash = SHA-256(prev_hash ‖ canonical row JSON) · rows are append-only (UPDATE/DELETE revoked)
              </p>
            </div>
            {!verify.valid && verify.first_broken_id != null && (
              <span className="ml-auto">
                <StatusChip tone="conflict">#{verify.first_broken_id} altered</StatusChip>
              </span>
            )}
          </div>
        )}

        {!rows ? <Skeleton className="h-52" /> : <AuditLogTable rows={rows.slice(0, 12)} />}
      </Card>

      <Card>
        <SectionTitle>Chain diagram</SectionTitle>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(rows ?? []).slice(0, 6).map((r, i) => (
            <div key={r.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "rounded-control border px-3 py-2 min-w-[130px]",
                  verify && !verify.valid && r.id === verify.first_broken_id
                    ? "border-conflict bg-conflict-bg"
                    : "border-line bg-surface",
                )}
              >
                <div className="text-[10.5px] font-bold text-ink">#{r.id}</div>
                <div className="mono text-[9px] text-ink-3">{shortHash(r.hash)}</div>
              </div>
              {i < 5 && <span className="text-ink-3 text-[13px]">→</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ===========================================================================
// Users & CPSEs
// ===========================================================================

function Users() {
  const { success } = useToast();
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ username: "", role: "UPLOADER" as Role, cpse: "" });

  const load = () => api.users().then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const columns: Column<AdminUserRow>[] = [
    {
      key: "u",
      label: "User",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-surface-3 text-ink flex items-center justify-center text-[10px] font-bold">
            {r.username.slice(0, 2).toUpperCase()}
          </span>
          <span className="mono text-[12.5px] font-semibold text-ink">{r.username}</span>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (r) => (
        <StatusChip tone="ink" dot={false}>
          {r.role}
        </StatusChip>
      ),
    },
    {
      key: "cpse",
      label: "CPSE scope",
      render: (r) => (r.cpse ? <span className="mono text-[11.5px] text-ink-2">{r.cpse}</span> : <span className="text-ink-3 text-[11.5px]">all</span>),
    },
    {
      key: "s",
      label: "Status",
      render: (r) => (r.active ? <StatusChip tone="match">active</StatusChip> : <StatusChip tone="na">disabled</StatusChip>),
    },
    {
      key: "act",
      label: "",
      align: "right",
      render: () => (
        <Button variant="ghost" className="!h-7 !px-2 !text-[11px]">
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <SectionTitle
        right={
          <Button variant="secondary" className="!h-8 !px-3 !text-[12px]" onClick={() => setOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Add user
          </Button>
        }
      >
        Users & CPSE scoping
      </SectionTitle>
      <p className="text-[11.5px] text-ink-2 mb-3.5">
        Uploaders see only their CPSE's data. Every admin write lands in the audit chain with before/after JSON.
      </p>
      {!users ? (
        <Skeleton className="h-40" />
      ) : (
        <DataTable columns={columns} rows={users} rowKey={(r) => String(r.id)} />
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add user">
        <div className="space-y-3.5">
          <div>
            <label className="label !text-[10px] block mb-1.5">Username</label>
            <Input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} placeholder="steward2" />
          </div>
          <div>
            <label className="label !text-[10px] block mb-1.5">Role</label>
            <select
              className="input cursor-pointer"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}
            >
              {["UPLOADER", "STEWARD", "APPROVER", "ADMIN", "AUDITOR"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label !text-[10px] block mb-1.5">CPSE scope (uploaders only)</label>
            <Input value={draft.cpse} onChange={(e) => setDraft({ ...draft, cpse: e.target.value })} placeholder="CPSE_A" />
          </div>
          <Button
            disabled={!draft.username}
            onClick={async () => {
              await api.addUser({ username: draft.username, role: draft.role, cpse: draft.cpse || null });
              success("User created", "Audit entry written.");
              setOpen(false);
              setDraft({ username: "", role: "UPLOADER", cpse: "" });
              load();
            }}
          >
            Create user
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
