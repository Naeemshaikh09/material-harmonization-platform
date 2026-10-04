import { useState } from "react";
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Check, Copy, X } from "lucide-react";
import type { AttrValue, Verdict } from "../../lib/types";
import { attrDisplay, codeSegments, cn, confPct } from "../../lib/format";

// ===== Buttons ==============================================================

export function Button({
  variant = "primary",
  children,
  className,
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : variant === "danger"
          ? "btn-danger"
          : "btn-ghost";
  return (
    <button className={cn(v, className)} {...rest}>
      {children}
    </button>
  );
}

// ===== Surfaces =============================================================

export function Card({
  children,
  className,
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return <div className={cn("card", pad && "p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="label">{children}</h3>
      {right}
    </div>
  );
}

// ===== Form controls ========================================================

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("input", props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("input resize-none", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "input appearance-none bg-no-repeat pr-9 cursor-pointer",
        props.className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236C6459' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 12px center",
      }}
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-[5px] border border-line-strong bg-surface-2 text-[10.5px] font-semibold text-ink-2 font-mono shadow-[0_1px_0_rgba(26,24,21,0.06)]">
      {children}
    </kbd>
  );
}

// ===== Chips / badges =======================================================

type Tone = "match" | "conflict" | "unknown" | "na" | "ink";

const TONES: Record<Tone, { bg: string; fg: string; bd: string; dot: string }> = {
  match: { bg: "bg-match-bg", fg: "text-match", bd: "border-match/25", dot: "bg-match" },
  conflict: { bg: "bg-conflict-bg", fg: "text-conflict", bd: "border-conflict/25", dot: "bg-conflict" },
  unknown: { bg: "bg-unknown-bg", fg: "text-unknown", bd: "border-unknown/25", dot: "bg-unknown" },
  na: { bg: "bg-surface-2", fg: "text-na", bd: "border-line", dot: "bg-na" },
  ink: { bg: "bg-surface-2", fg: "text-ink-2", bd: "border-line", dot: "bg-ink-3" },
};

export function StatusChip({
  tone = "ink",
  children,
  dot = true,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span className={cn("chip", t.bg, t.fg, t.bd, className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

const VERDICT_TONE: Record<Verdict, Tone> = {
  MATCH: "match",
  CONFLICT: "conflict",
  UNKNOWN: "unknown",
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  return <StatusChip tone={VERDICT_TONE[verdict]}>{verdict}</StatusChip>;
}

export function StateChip({ state }: { state: AttrValue["state"] }) {
  if (state === "KNOWN") return <StatusChip tone="match">KNOWN</StatusChip>;
  if (state === "UNKNOWN") return <StatusChip tone="unknown">UNKNOWN</StatusChip>;
  return <StatusChip tone="na">N/A</StatusChip>;
}

// ===== Confidence bar =======================================================

export function ConfidenceBar({ value, showPct = true }: { value?: number; showPct?: boolean }) {
  if (value == null) return <span className="text-ink-3 text-[11px]">—</span>;
  const pct = Math.round(value * 100);
  const color = value >= 0.85 ? "#15803D" : value >= 0.6 ? "#B45309" : "#B42318";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-[44px] h-[4px] rounded-full bg-surface-3 overflow-hidden">
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </span>
      {showPct && <span className="num text-[11px] text-ink-3">{confPct(value)}</span>}
    </span>
  );
}

// ===== Attribute badge =====================================================

export function AttributeBadge({ attr, label, compact }: { attr?: AttrValue; label: string; compact?: boolean }) {
  const state = attr?.state ?? "UNKNOWN";
  const tone: Tone = state === "KNOWN" ? "match" : state === "UNKNOWN" ? "unknown" : "na";
  return (
    <div
      className={cn(
        "rounded-control border px-3 py-2 bg-surface",
        state === "UNKNOWN" ? "border-unknown/30 bg-unknown-bg/40" : "border-line",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", TONES[tone].dot)} />
        <span className="label !text-[9.5px]">{label}</span>
      </div>
      <div className={cn("mt-1 font-semibold text-[13px] leading-tight", state === "NA" ? "text-na" : "text-ink")}>
        {attrDisplay(attr)}
      </div>
      {!compact && state === "KNOWN" && (
        <div className="mt-1.5">
          <ConfidenceBar value={attr?.confidence} />
        </div>
      )}
    </div>
  );
}

// ===== Code display ========================================================

export function CodeDisplay({
  code,
  size = "md",
  copyable = true,
  className,
}: {
  code: string;
  size?: "sm" | "md" | "lg";
  copyable?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const segs = codeSegments(code);
  const dims =
    size === "lg"
      ? "text-[19px] sm:text-[22px]"
      : size === "sm"
        ? "text-[11.5px]"
        : "text-[13.5px]";

  return (
    <span
      className={cn(
        "group inline-flex items-center gap-2 rounded-control border border-line bg-surface-2/70 px-2.5 py-1.5",
        className,
      )}
    >
      <code className={cn("mono font-semibold tracking-tight text-ink whitespace-nowrap", dims)}>
        {segs.map((s, i) => (
          <span key={i}>
            {i > 0 && <span className="text-ink-3 font-normal">-</span>}
            {s}
          </span>
        ))}
      </code>
      {copyable && (
        <button
          type="button"
          aria-label="Copy code"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className={cn(
            "transition-all duration-150 rounded-md p-1",
            copied ? "text-match" : "text-ink-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink hover:bg-surface-3",
          )}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
}

// ===== Tabs ================================================================

export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1 rounded-control bg-surface-2 p-1 border border-line w-fit max-w-full overflow-x-auto", className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex items-center gap-2 whitespace-nowrap rounded-[8px] px-3.5 h-8 text-[13px] font-semibold transition-all duration-150",
            active === t.id
              ? "bg-surface text-ink shadow-[0_1px_2px_rgba(26,24,21,0.08)]"
              : "text-ink-2 hover:text-ink",
          )}
        >
          {t.label}
          {t.count != null && (
            <span
              className={cn(
                "num text-[10.5px] px-1.5 py-0.5 rounded-full",
                active === t.id ? "bg-surface-2 text-ink-2" : "text-ink-3",
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ===== Modal ===============================================================

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cn("card shadow-pop w-full animate-fade-up", width)} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-[15px] font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="btn-ghost !h-8 !w-8 !p-0 rounded-full" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ===== Feedback ============================================================

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-control bg-surface-3/80", className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {body && <p className="text-[13px] text-ink-2 mt-1 max-w-sm leading-relaxed">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
  children,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: "match" | "conflict" | "unknown" | "ink";
  children?: ReactNode;
}) {
  return (
    <div className="card p-4 flex flex-col justify-between min-h-[112px]">
      <div className="flex items-start justify-between gap-2">
        <span className="label">{label}</span>
        {accent && <span className={cn("w-2 h-2 rounded-full mt-1", TONES[accent].dot)} />}
      </div>
      <div>
        <div className="num text-[26px] font-bold leading-none tracking-tight text-ink">{value}</div>
        {sub && <div className="text-[11.5px] text-ink-2 mt-1.5">{sub}</div>}
        {children}
      </div>
    </div>
  );
}

export function Progress({ pct, tone = "ink" }: { pct: number; tone?: Tone }) {
  return (
    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, pct)}%`, background: TONES[tone].dot.replace("bg-", "") && undefined }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: "100%",
            background:
              tone === "match" ? "#15803D" : tone === "conflict" ? "#B42318" : tone === "unknown" ? "#B45309" : "#1A1815",
          }}
        />
      </div>
    </div>
  );
}
