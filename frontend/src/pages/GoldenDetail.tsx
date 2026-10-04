import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Download, History, Loader2, Network, PackageSearch } from "lucide-react";
import { api } from "../lib/api";
import type { AttrKey, CmcDetail } from "../lib/types";
import { ATTR_LABELS, ATTR_KEYS, CRITICAL_KEYS } from "../lib/types";
import { attrDisplay, cn, downloadCSV, fmtINR, fmtInt } from "../lib/format";
import {
  Button,
  Card,
  CodeDisplay,
  ConfidenceBar,
  SectionTitle,
  Skeleton,
  StateChip,
  StatusChip,
} from "../components/ui/Primitives";
import {
  AuditTimeline,
  FormulaCard,
  PriceRow,
  RelationshipTree,
  SupersessionBanner,
  SyntheticBadge,
} from "../components/domain/Domain";

export default function GoldenDetail() {
  const { code = "" } = useParams();
  const [rec, setRec] = useState<CmcDetail | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setRec(null);
    setMissing(false);
    api.getCmc(code)
      .then(setRec)
      .catch(() => setMissing(true));
  }, [code]);

  if (missing) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-[15px] font-semibold text-ink">No golden record for this code</p>
          <p className="text-[12.5px] text-ink-2 mt-1">
            Check the code, or search the golden master again.
          </p>
          <Link to="/golden" className="btn-secondary inline-flex mt-4">
            <ArrowLeft className="w-4 h-4" /> Back to search
          </Link>
        </div>
      </Card>
    );
  }

  if (!rec) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  const dims = ATTR_KEYS.filter((k) => rec.attributes[k]);
  const known = dims.filter((k) => rec.attributes[k]?.state === "KNOWN").length;
  const unknown = dims.filter((k) => rec.attributes[k]?.state === "UNKNOWN").length;
  const na = dims.filter((k) => rec.attributes[k]?.state === "NA").length;

  return (
    <div className="space-y-5">
      <Link to="/golden" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2 hover:text-ink transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All golden records
      </Link>

      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <CodeDisplay code={rec.code} size="lg" />
              {rec.status === "ACTIVE" ? (
                <StatusChip tone="match">ACTIVE</StatusChip>
              ) : (
                <StatusChip tone="unknown">SUPERSEDED</StatusChip>
              )}
              <StatusChip tone="ink" dot={false}>
                {rec.class}
              </StatusChip>
              <StatusChip tone="ink" dot={false}>
                {rec.subclass.replace(/_/g, " ")}
              </StatusChip>
            </div>
            <p className="mono text-[13.5px] text-ink mt-3.5">{rec.description.short}</p>
            <p className="text-[12.5px] text-ink-2 mt-1">{rec.description.long}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(`cmc_${rec.code}.csv`, [
                  ["dimension", "value", "unit", "code", "state", "confidence"],
                  ...ATTR_KEYS.map((k) => {
                    const a = rec.attributes[k];
                    return [k, a?.value ?? "", a?.unit ?? "", a?.code ?? "", a?.state ?? "", a?.confidence ?? ""];
                  }),
                ])
              }
            >
              <Download className="w-4 h-4" /> Export attributes
            </Button>
          </div>
        </div>
      </Card>

      <SupersessionBanner record={rec} />

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-5 items-start">
        {/* ---- 20-dimension table ---- */}
        <Card>
          <SectionTitle
            right={
              <div className="flex items-center gap-1.5">
                <StatusChip tone="match">{known} known</StatusChip>
                <StatusChip tone="unknown">{unknown} unknown</StatusChip>
                <StatusChip tone="na">{na} n/a</StatusChip>
              </div>
            }
          >
            Twenty governed dimensions
          </SectionTitle>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr>
                  <th className="label !text-[10px] pb-2.5 text-left border-b border-line w-[210px]">Dimension</th>
                  <th className="label !text-[10px] pb-2.5 text-left border-b border-line">Value</th>
                  <th className="label !text-[10px] pb-2.5 text-left border-b border-line w-[90px]">Code</th>
                  <th className="label !text-[10px] pb-2.5 text-left border-b border-line w-[110px]">State</th>
                  <th className="label !text-[10px] pb-2.5 text-left border-b border-line w-[110px]">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {ATTR_KEYS.map((k) => {
                  const a = rec.attributes[k];
                  const state = a?.state ?? "UNKNOWN";
                  const critical = CRITICAL_KEYS.includes(k);
                  return (
                    <tr
                      key={k}
                      className={cn(
                        "table-row",
                        state === "UNKNOWN" && "bg-unknown-bg/40 hover:bg-unknown-bg/60",
                        critical && "border-l-[3px] border-l-ink/70",
                      )}
                    >
                      <td className="py-2.5 pl-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-semibold text-ink">{ATTR_LABELS[k]}</span>
                          {critical && (
                            <span className="text-[9px] font-bold uppercase tracking-label text-ink-3 border border-line-strong rounded px-1 py-px">
                              critical
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "text-[12.5px]",
                            state === "NA" ? "text-na" : state === "UNKNOWN" ? "text-unknown italic" : "text-ink font-medium",
                          )}
                        >
                          {state === "UNKNOWN" ? "not found in source" : attrDisplay(a)}
                        </span>
                        {a?.source_span && state === "KNOWN" && (
                          <span className="mono text-[10px] text-ink-3 ml-2">“{a.source_span}”</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {a?.code ? (
                          <code className="mono text-[11.5px] text-ink-2">{a.code}</code>
                        ) : (
                          <span className="text-ink-3 text-[11.5px]">—</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <StateChip state={state} />
                      </td>
                      <td className="py-2.5">
                        {state === "KNOWN" ? (
                          <ConfidenceBar value={a?.confidence} />
                        ) : (
                          <span className="text-ink-3 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Procurement */}
          {rec.procurement && (
            <div className="mt-7 pt-5 border-t border-line">
              <SectionTitle right={<SyntheticBadge />}>Procurement intelligence</SectionTitle>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <div className="rounded-control border border-line bg-surface-2/60 px-3.5 py-3">
                  <div className="label !text-[9px]">Pooled demand</div>
                  <div className="num text-[21px] font-bold text-ink mt-1">{fmtInt(rec.procurement.pooled_qty)}</div>
                  <div className="text-[10.5px] text-ink-2">units across CPSEs</div>
                </div>
                <div className="rounded-control border border-line bg-surface-2/60 px-3.5 py-3">
                  <div className="label !text-[9px]">Best price</div>
                  <div className="num text-[21px] font-bold text-match mt-1">{fmtINR(rec.procurement.min_price)}</div>
                  <div className="text-[10.5px] text-ink-2">observed low</div>
                </div>
                <div className="rounded-control border border-line bg-surface-2/60 px-3.5 py-3">
                  <div className="label !text-[9px]">Price spread</div>
                  <div className="num text-[21px] font-bold text-unknown mt-1">
                    {fmtINR(rec.procurement.max_price - rec.procurement.min_price)}
                  </div>
                  <div className="text-[10.5px] text-ink-2">high − low per unit</div>
                </div>
              </div>
              <FormulaCard
                formula="price_spread_saving_upper_bound = Σ (price_i − min_price) × qty_i"
                explanation="An upper bound only — shown with the formula visible so nobody mistakes it for a realised saving."
              />
            </div>
          )}
        </Card>

        {/* ---- Right rail ---- */}
        <div className="space-y-5">
          <Card>
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" /> Relationship tree
              </span>
            </SectionTitle>
            <RelationshipTree record={rec} />
          </Card>

          <Card>
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Audit timeline
              </span>
            </SectionTitle>
            <AuditTimeline events={rec.history} />
          </Card>

          <Card>
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <PackageSearch className="w-3.5 h-3.5" /> Decision rules applied
              </span>
            </SectionTitle>
            <ul className="space-y-2.5 text-[12px] text-ink-2 leading-relaxed">
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-match mt-[5px] shrink-0" />
                Identity decided on critical dimensions only:{" "}
                {CRITICAL_KEYS.map((k) => ATTR_LABELS[k]).join(", ")}.
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-conflict mt-[5px] shrink-0" />
                Any critical CONFLICT forces a separate CMC — SS316 CL150 and CL300 never merge.
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-unknown mt-[5px] shrink-0" />
                Unknown is never treated as not-applicable. <span className="text-na font-medium">NA</span> comes
                only from the class template.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
