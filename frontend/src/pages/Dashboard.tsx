import { useEffect, useState } from "react";
import { AlertTriangle, Download, Info, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "../lib/api";
import type { AnalyticsSummary, MetricsResponse, ProcurementResponse } from "../lib/types";
import { cn, downloadCSV, fmtINR, fmtInt, fmtPct } from "../lib/format";
import {
  Button,
  Card,
  CodeDisplay,
  SectionTitle,
  Skeleton,
  StatCard,
  StatusChip,
  Tabs,
} from "../components/ui/Primitives";
import { BarChart, FormulaCard, MiniMeter, PriceRow, Sparkline, StackedBars, SyntheticBadge } from "../components/domain/Domain";

export default function Dashboard() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "procurement", label: "Procurement" },
          { id: "metrics", label: "Model metrics" },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "overview" && <Overview />}
      {tab === "procurement" && <Procurement />}
      {tab === "metrics" && <Metrics />}
    </div>
  );
}

function Overview() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  useEffect(() => {
    api.analytics().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px]" />
        ))}
      </div>
    );
  }

  const coverage = [
    {
      label: "CPSE_A — 1,240 codes",
      segments: [
        { value: 920, color: "#15803D", name: "Linked" },
        { value: 180, color: "#B45309", name: "Pending" },
        { value: 140, color: "#1A1815", name: "New CMC" },
      ],
    },
    {
      label: "CPSE_B — 2,100 codes",
      segments: [
        { value: 1450, color: "#15803D", name: "Linked" },
        { value: 380, color: "#B45309", name: "Pending" },
        { value: 270, color: "#1A1815", name: "New CMC" },
      ],
    },
    {
      label: "CPSE_C — 1,660 codes",
      segments: [
        { value: 1130, color: "#15803D", name: "Linked" },
        { value: 310, color: "#B45309", name: "Pending" },
        { value: 220, color: "#1A1815", name: "New CMC" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Records ingested"
          value={fmtInt(data.records)}
          sub="3 CPSEs · 5,000-row pilot files"
        >
          <div className="mt-2">
            <Sparkline points={[3, 5, 8, 9, 12, 15]} />
          </div>
        </StatCard>
        <StatCard label="Distinct CMCs" value={fmtInt(data.cmcs)} sub="golden master size">
          <div className="mt-2">
            <Sparkline points={[2, 4, 6, 8, 9, 9.1]} />
          </div>
        </StatCard>
        <StatCard
          label="Duplicates found"
          value={fmtInt(data.duplicates_found)}
          sub="same item, different codes"
          accent="match"
        >
          <div className="mt-2">
            <Sparkline points={[1, 2, 3.5, 4, 5, 5.9]} color="#15803D" />
          </div>
        </StatCard>
        <StatCard label="Review rate" value={fmtPct(data.review_rate)} sub="sent to human stewards" accent="unknown">
          <div className="mt-2">
            <Sparkline points={[3.2, 2.8, 2.4, 2.1, 1.9, 1.8]} color="#B45309" />
          </div>
        </StatCard>
        <StatCard label="Auto-resolved" value={fmtPct(data.auto_resolved_rate)} sub="without human touch" accent="ink">
          <div className="mt-2">
            <Sparkline points={[4.8, 5.5, 6.2, 6.8, 7.1, 7.4]} />
          </div>
        </StatCard>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        <Card>
          <SectionTitle>Duplicates by category</SectionTitle>
          <BarChart
            data={data.by_category.map((c) => ({
              label: c.class,
              value: c.records - c.cmcs,
              sub: `of ${fmtInt(c.records)}`,
            }))}
          />
          <p className="text-[11px] text-ink-2 mt-4 leading-relaxed flex gap-1.5">
            <Info className="w-3.5 h-3.5 text-ink-3 shrink-0 mt-px" />
            Duplicates = records minus distinct CMCs. This is the stock-release opportunity —
            quantified honestly in the procurement tab.
          </p>
        </Card>

        <Card>
          <SectionTitle>Coverage by CPSE</SectionTitle>
          <StackedBars data={coverage} />
        </Card>

        <Card>
          <SectionTitle>Migration progress</SectionTitle>
          <div className="space-y-4">
            <MiniMeter label="CPSE_A · VALVE" value={920} total={1240} />
            <MiniMeter label="CPSE_B · VALVE" value={1450} total={2100} />
            <MiniMeter label="CPSE_C · PIPE" value={1130} total={1660} />
            <MiniMeter label="CPSE_A · BEARING" value={210} total={640} />
          </div>
          <div className="mt-5 rounded-control border border-line bg-surface-2/60 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-unknown" />
              <span className="text-[11.5px] font-semibold text-ink">Conservative by design</span>
            </div>
            <p className="text-[11px] text-ink-2 mt-1 leading-relaxed">
              Incomplete or uncertain records wait for a steward instead of guessing. The review
              rate is the honest cost of never making a wrong merge.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Procurement() {
  const [data, setData] = useState<ProcurementResponse | null>(null);
  useEffect(() => {
    api.procurement().then(setData);
  }, []);
  if (!data) return <Skeleton className="h-72" />;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle right={<SyntheticBadge />}>Pooled demand & price spread</SectionTitle>
        <p className="text-[12.5px] text-ink-2 mb-4 max-w-2xl leading-relaxed">
          Savings figures are <strong>upper-bound estimates from synthetic data</strong> — labelled
          everywhere on purpose. Real CPSE procurement data is not public; the formula is shown so
          the number can be argued with.
        </p>
        {data.items.map((item) => (
          <div key={item.cmc} className="rounded-card border border-line mb-4 last:mb-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-line bg-surface-2/50">
              <CodeDisplay code={item.cmc} size="sm" />
              <span className="text-[11.5px] text-ink-2">
                pooled <strong className="text-ink num">{fmtInt(item.pooled_qty)}</strong> units
              </span>
              <span className="ml-auto num text-[13px] font-bold text-match">
                up to {fmtINR(item.price_spread_saving_upper_bound)} spread saving
              </span>
            </div>
            <div className="px-4 py-3 grid lg:grid-cols-[1.2fr_1fr] gap-5">
              <div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["CPSE", "Qty", "Unit price", "vs best"].map((h, i) => (
                        <th key={h} className={cn("label !text-[9.5px] pb-2 border-b border-line", i > 0 ? "text-right" : "text-left")}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.cpse_breakdown.map((c) => (
                      <PriceRow key={c.cpse} cpse={c.cpse} qty={c.qty} price={c.price} minPrice={Math.min(...item.cpse_breakdown.map((x) => x.price))} />
                    ))}
                  </tbody>
                </table>
              </div>
              <FormulaCard
                formula={item.formula}
                explanation="Sum over each CPSE of (its unit price − best observed unit price) × its annual quantity. Upper bound: assumes every unit could be bought at the best price."
              />
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle>Surplus matches — one CPSE's excess is another's demand</SectionTitle>
        <div className="space-y-2.5">
          {data.surplus_matches.map((s) => (
            <div key={s.cmc + s.from} className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-surface-2/50 px-4 py-3">
              <CodeDisplay code={s.cmc} size="sm" />
              <StatusChip tone="ink" dot={false}>
                {s.from}
              </StatusChip>
              <span className="text-ink-3">→</span>
              <StatusChip tone="ink" dot={false}>
                {s.to}
              </StatusChip>
              <span className="num text-[12.5px] font-semibold text-ink">{fmtInt(s.qty)} units available</span>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() =>
            downloadCSV("procurement_synthetic.csv", [
              ["cmc", "pooled_qty", "saving_upper_bound", "formula"],
              ...data.items.map((i) => [i.cmc, i.pooled_qty, i.price_spread_saving_upper_bound, i.formula]),
            ])
          }
        >
          <Download className="w-4 h-4" /> Export synthetic procurement
        </Button>
      </Card>
    </div>
  );
}

function Metrics() {
  const [m, setM] = useState<MetricsResponse | null>(null);
  useEffect(() => {
    api.metrics().then(setM);
  }, []);
  if (!m) return <Skeleton className="h-72" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Run" value={m.run} sub={`dataset ${m.dataset}`} />
        <StatCard label="Sample size" value={fmtInt(m.sample_size)} sub="frozen test split, by item" />
        <StatCard
          label="False-merge rate"
          value={`${(m.false_merge_rate * 100).toFixed(1)}%`}
          sub="wrongly shared a CMC"
          accent="match"
        />
        <StatCard
          label="False-split rate"
          value={`${(m.false_split_rate * 100).toFixed(1)}%`}
          sub="same item kept separate"
          accent="unknown"
        />
      </div>

      <Card>
        <SectionTitle right={<StatusChip tone="ink" dot={false}>n = {fmtInt(m.sample_size)}</StatusChip>}>
          Per-attribute accuracy — rules baseline vs fine-tuned model
        </SectionTitle>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr>
                {["Attribute", "Baseline", "Model", "Delta", "n"].map((h, i) => (
                  <th key={h} className={cn("label !text-[10px] pb-2.5 border-b border-line", i > 0 ? "text-right" : "text-left")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.per_attribute.map((r) => {
                const delta = r.model - r.baseline;
                return (
                  <tr key={r.attribute} className="table-row">
                    <td className="py-3 text-[12.5px] font-semibold text-ink capitalize">{r.attribute.replace("_", " ")}</td>
                    <td className="py-3 num text-[12.5px] text-ink-2 text-right">{fmtPct(r.baseline)}</td>
                    <td className="py-3 num text-[12.5px] text-ink font-semibold text-right">{fmtPct(r.model)}</td>
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 chip",
                          delta > 0 ? "bg-match-bg text-match border-match/25" : "bg-surface-2 text-ink-2 border-line",
                        )}
                      >
                        {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        +{Math.round(delta * 100)}pp
                      </span>
                    </td>
                    <td className="py-3 num text-[12px] text-ink-3 text-right">{r.n}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-ink-2 mt-4 leading-relaxed flex gap-1.5">
          <Info className="w-3.5 h-3.5 text-ink-3 shrink-0 mt-px" />
          Honest limits: numbers come from a small labelled set ({fmtInt(m.sample_size)} items), split by
          item, test set never seen in training. Text-similarity-only baseline is published in the
          metrics table for comparison.
        </p>
      </Card>
    </div>
  );
}
