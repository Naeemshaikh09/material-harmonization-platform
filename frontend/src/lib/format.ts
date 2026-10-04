import type { AttrValue } from "./types";

/** Tiny class-name composer (keeps JSX readable). */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** `0112-0003-0050-0017-0150-0001-4` → grouped segments for CodeDisplay. */
export function codeSegments(code: string): string[] {
  return code.split("-");
}

/** Human value for an attribute cell: NA → em dash, UNKNOWN → unknown marker. */
export function attrDisplay(a?: AttrValue): string {
  if (!a || a.state === "NA") return "—";
  if (a.state === "UNKNOWN") return "not found";
  return a.value ? (a.unit ? `${a.value} ${a.unit}` : a.value) : "—";
}

export function confPct(c?: number): string {
  return c == null ? "—" : `${Math.round(c * 100)}%`;
}

export function fmtInt(n: number): string {
  return n.toLocaleString("en-IN");
}

export function fmtINR(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function fmtPct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function fmtTs(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short hash for audit display. */
export function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h;
}

/** Client-side CSV download (crosswalk export). */
export function downloadCSV(filename: string, rows: (string | number | null)[][]) {
  const csv = rows
    .map((r) =>
      r
        .map((c) => {
          const s = c == null ? "" : String(c);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
