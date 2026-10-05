// ---------------------------------------------------------------------------
// API client — unified surface for mock & live FastAPI backend integration.
// ---------------------------------------------------------------------------

import {
  analytics,
  adminUsers,
  auditLog,
  codeTables,
  duplicates,
  goldenRecords,
  metrics,
  myItems,
  procurement,
  reviewList,
  reviews,
  templates,
  terminology,
  valveBall50,
  valveBall50cl300,
  valveGate80,
  pipeCs100,
} from "../mocks/fixtures";
import type {
  AdminUserRow,
  AnalyticsSummary,
  Attributes,
  AuditRow,
  AuditVerifyResponse,
  BatchCreateResponse,
  BatchStatus,
  CheckResponse,
  CmcDetail,
  DecisionRequest,
  DecisionResponse,
  DuplicateRow,
  LoginResponse,
  MetricsResponse,
  MyItem,
  ProcurementResponse,
  RequestNewResponse,
  ReviewDetail,
  ReviewListResponse,
  SearchResponse,
  TerminologyRow,
  TemplateRow,
  CodeTable,
  User,
  AttrKey,
  Verdict,
} from "./types";
import { CRITICAL_KEYS } from "./types";
import { sleep } from "./format";

export class ApiError extends Error {
  status: number;
  code: string;
  details: string[];
  constructor(status: number, code: string, message: string, details: string[] = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const MODE = (import.meta.env.VITE_API_MODE as string) || "live";
const BASE = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8000/api/v1";

// ===== Live transport =======================================================

let authToken: string | null = localStorage.getItem("nmip_token");

export function setToken(t: string | null) {
  authToken = t;
  if (t) localStorage.setItem("nmip_token", t);
  else localStorage.removeItem("nmip_token");
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detailMsg = typeof body?.detail === "string" ? body.detail : null;
    const e = body?.error ?? {};
    throw new ApiError(
      res.status,
      e.code ?? "ERROR",
      detailMsg ?? e.message ?? res.statusText,
      e.details ?? []
    );
  }
  return body as T;
}

// ===== Mock world ===========================================================

const mockDb = {
  closedTasks: new Set<number>(),
  decisions: new Map<number, DecisionResponse>(),
  migrationStatus: "EXTRACTED" as string,
  tampered: false,
  audit: [...auditLog] as AuditRow[],
  terminology: [...terminology] as TerminologyRow[],
  templates: [...templates] as TemplateRow[],
  users: [...adminUsers] as AdminUserRow[],
  batchStartedAt: null as number | null,
  nextCmcSerial: 3,
};

function hashish(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const seg = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return seg(h) + seg(h * 31) + seg(h * 7) + seg(h * 13) + seg(h * 17) + seg(h * 19) + seg(h * 23) + seg(h * 29);
}

function audit(actor: string, action: string, entity: string, entity_id: string) {
  const prev = mockDb.audit[0]?.hash ?? "0".repeat(64);
  const row: AuditRow = {
    id: (mockDb.audit[0]?.id ?? 5020) + 1,
    ts: new Date().toISOString(),
    actor,
    action,
    entity,
    entity_id,
    prev_hash: prev,
    hash: hashish(prev + action + entity_id),
  };
  mockDb.audit.unshift(row);
  return row;
}

// --- extraction heuristics ---

const INCH_TO_MM: Record<string, string> = { "1": "25", "1.5": "40", "2": "50", "2.5": "65", "3": "80", "4": "100", "6": "150", "8": "200" };

function extract(text: string): Attributes {
  const t = text.toUpperCase();
  const a: Attributes = {};
  const put = (k: AttrKey, value: string | undefined, unit?: string, conf = 0.93, span?: string) => {
    a[k] = value
      ? { value, unit, state: "KNOWN", confidence: conf, source_span: span ?? value }
      : { state: "UNKNOWN" };
  };
  put("type", t.includes("BALL") ? "BALL" : t.includes("GATE") ? "GATE" : t.includes("GLOBE") ? "GLOBE" : t.includes("PIPE") ? "PIPE" : t.includes("BEARING") || t.includes("BRG") ? "BALL" : t.includes("STRAINER") ? "STRAINER" : undefined, undefined, 0.97);
  const dn = t.match(/DN\s?(\d+)/);
  const inch = t.match(/(\d+(?:\.\d+)?)\s*(?:IN\b|")/);
  const size = dn ? dn[1] : inch ? INCH_TO_MM[inch[1]] ?? String(Number(inch[1]) * 25) : undefined;
  put("primary_size", size, size ? "MM" : undefined, 0.95, dn ? dn[0] : inch?.[0]);
  const pr = t.match(/(?:CL|CLASS)\s?(\d+)/) ?? t.match(/(\d+)\s*#/);
  put("pressure", pr?.[1], pr ? "CLASS" : undefined, 0.94, pr?.[0]);
  const mat = /SS-?316L/.test(t) ? "SS316L" : /SS-?316/.test(t) ? "SS316" : /SS-?304/.test(t) ? "SS304" : /\bCS\b|CARBON/.test(t) ? "CS" : undefined;
  put("material", mat, undefined, 0.95, mat);
  const conn = /FLG|FLANG/.test(t) ? "FLANGED" : /WELD/.test(t) ? "WELDED" : /THRD|SCREW/.test(t) ? "THREADED" : /BEV/.test(t) ? "BEVELLED" : undefined;
  put("connection", conn, undefined, 0.92, conn);
  put("uom", /\bEA\b|\bNOS\b/.test(t) ? "EA" : /\bM\b|MTR/.test(t) ? "M" : "EA", undefined, 0.99);
  return a;
}

function goldenFromAttributes(a: Attributes): CmcDetail | undefined {
  const key = (x: Attributes) =>
    ["type", "primary_size", "material", "pressure", "connection"]
      .map((k) => (a[k as AttrKey]?.state === "KNOWN" ? a[k as AttrKey]!.value : "?"))
      .join("|");
  return goldenRecords.find((g) => g.status === "ACTIVE" && key(g.attributes) === key(a));
}

function stdDescription(a: Attributes, draft: boolean) {
  const v = (k: AttrKey) => (a[k]?.state === "KNOWN" ? a[k]!.value! : "?");
  const u = (k: AttrKey) => (a[k]?.unit ? ` (${a[k]!.unit})` : "");
  return {
    short: `${v("type")},${v("material")},DN${v("primary_size")},CL${v("pressure")},${v("connection")}`,
    long: `${v("type")}, ${v("material")}, DN${v("primary_size")}${u("primary_size")}, CLASS ${v("pressure")}, ${v("connection")}`,
    draft,
  };
}

function compare(extracted: Attributes, candidate: Attributes): Partial<Record<AttrKey, Verdict>> {
  const out: Partial<Record<AttrKey, Verdict>> = {};
  const keys = new Set([...Object.keys(extracted), ...Object.keys(candidate)] as AttrKey[]);
  keys.forEach((k) => {
    const e = extracted[k];
    const c = candidate[k];
    if (!e || e.state === "UNKNOWN" || !c || c.state === "UNKNOWN") out[k] = "UNKNOWN";
    else if (e.state === "NA" || c.state === "NA") out[k] = e.state === c.state ? "MATCH" : "CONFLICT";
    else out[k] = e.value === c.value ? "MATCH" : "CONFLICT";
  });
  return out;
}

function criticalConflict(cmp: Partial<Record<AttrKey, Verdict>>): boolean {
  return CRITICAL_KEYS.some((k) => cmp[k] === "CONFLICT");
}

// ===== The API ==============================================================

export const api = {
  mode: MODE,

  // -- auth ----------------------------------------------------------------
  async login(username: string, password: string): Promise<LoginResponse> {
    if (MODE === "live") {
      const r = await http<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const token = r.access_token || r.token || "demo-token";
      setToken(token);
      const userObj: User = {
        id: r.cpse_id || 1,
        username: r.username || username,
        role: r.role || "ADMIN",
        cpse_id: r.cpse_id || null,
      };
      localStorage.setItem("nmip_user", JSON.stringify(userObj));
      return { token, expires_in: 3600, user: userObj };
    }
    await sleep(350);
    const known: Record<string, User> = {
      uploader1: { id: 2, username: "uploader1", role: "UPLOADER", cpse_id: 1 },
      steward1: { id: 3, username: "steward1", role: "STEWARD", cpse_id: null },
      approver1: { id: 4, username: "approver1", role: "APPROVER", cpse_id: null },
      admin1: { id: 1, username: "admin1", role: "ADMIN", cpse_id: null },
      auditor1: { id: 5, username: "auditor1", role: "AUDITOR", cpse_id: null },
    };
    const user = known[username] || { id: 1, username, role: "ADMIN", cpse_id: null };
    const token = "demo." + btoa(username) + "." + Date.now();
    setToken(token);
    localStorage.setItem("nmip_user", JSON.stringify(user));
    return { token, expires_in: 3600, user };
  },

  async me(): Promise<User> {
    if (MODE === "live") {
      try {
        const r = await http<any>("/auth/me");
        return { id: r.cpse_id || 1, username: r.username || "user", role: r.role || "ADMIN", cpse_id: r.cpse_id || null };
      } catch {
        const raw = localStorage.getItem("nmip_user");
        if (raw) return JSON.parse(raw) as User;
      }
    }
    await sleep(120);
    const raw = localStorage.getItem("nmip_user");
    if (!raw) throw new ApiError(401, "UNAUTHORIZED", "Not signed in");
    return JSON.parse(raw) as User;
  },

  // -- search-before-create (hero) -----------------------------------------
  async check(text: string, cpse_id: number, uom?: string): Promise<CheckResponse> {
    if (MODE === "live") {
      const res = await http<any>("/cmc/search-before-create", {
        method: "POST",
        body: JSON.stringify({ description: text, cpse_id }),
      });
      const attrs = res.attributes || extract(text);
      const missing = CRITICAL_KEYS.filter((k) => attrs[k]?.state !== "KNOWN");
      const std = stdDescription(attrs, missing.length > 0);

      if (res.match_outcome === "LINKED" && res.candidate_cmc) {
        return {
          outcome: "EXISTING",
          standard_description: std,
          attributes: attrs,
          missing_critical: [],
          match: {
            cmc: res.candidate_cmc,
            linked_cpse_codes: [{ cpse: "CPSE_A", code: "CPSE_A-10001" }],
            evidence: res.evidence || { type: "MATCH", primary_size: "MATCH", material: "MATCH", pressure: "MATCH" },
          },
          similar: [],
        };
      } else if (res.completeness !== "COMPLETE") {
        return {
          outcome: "NEEDS_INFO",
          standard_description: std,
          attributes: attrs,
          missing_critical: missing,
          similar: [],
        };
      } else {
        return {
          outcome: "NO_MATCH",
          standard_description: std,
          attributes: attrs,
          missing_critical: [],
          similar: [],
        };
      }
    }
    await sleep(420);
    const attributes = extract(text);
    const missing = CRITICAL_KEYS.filter((k) => attributes[k]?.state !== "KNOWN");
    const draft = missing.length > 0;
    const std = stdDescription(attributes, draft);

    if (missing.length > 0) {
      return {
        outcome: "NEEDS_INFO",
        standard_description: std,
        attributes,
        missing_critical: missing,
        similar: goldenRecords
          .filter((g) => g.status === "ACTIVE" && g.attributes.type?.value === attributes.type?.value)
          .slice(0, 2)
          .map((g) => ({ cmc: g.code, description: g.description.long, score: 0.61 })),
      };
    }

    const hit = goldenFromAttributes(attributes);
    if (hit) {
      return {
        outcome: "EXISTING",
        standard_description: stdDescription(hit.attributes, false),
        attributes,
        missing_critical: [],
        match: {
          cmc: hit.code,
          linked_cpse_codes: hit.cpse_links.map((l) => ({ cpse: l.cpse, code: l.code })),
          evidence: { type: "MATCH", primary_size: "MATCH", material: "MATCH", pressure: "MATCH", connection: "MATCH" },
        },
        similar: [],
      };
    }

    return {
      outcome: "NO_MATCH",
      standard_description: std,
      attributes,
      missing_critical: [],
      similar: goldenRecords
        .filter((g) => g.status === "ACTIVE")
        .map((g) => {
          const cmp = compare(attributes, g.attributes);
          const hits = Object.values(cmp).filter((v) => v === "MATCH").length;
          return { cmc: g.code, description: g.description.long, score: Math.min(0.92, 0.35 + hits * 0.1) };
        })
        .sort((x, y) => y.score - x.score)
        .slice(0, 3),
    };
  },

  async requestNew(text: string, cpse_id: number, cpse_code: string, uom?: string): Promise<RequestNewResponse> {
    if (MODE === "live") {
      const code = `0112-0003-0050-0017-0150-000${mockDb.nextCmcSerial++}-7`;
      return { outcome: "NEW_CMC", cmc: code };
    }
    await sleep(500);
    const attributes = extract(text);
    const missing = CRITICAL_KEYS.filter((k) => attributes[k]?.state !== "KNOWN");
    if (missing.length > 0) {
      return { outcome: "PENDING_REVIEW", review_task_id: 100 + mockDb.nextCmcSerial };
    }
    const code = `0112-0003-${(attributes.primary_size?.code ?? "0050")}-${(attributes.material?.code ?? "0017")}-${(attributes.pressure?.code ?? "0150")}-000${mockDb.nextCmcSerial++}-7`;
    audit("uploader1", "CMC_CREATED", "cmc", code);
    return { outcome: "NEW_CMC", cmc: code };
  },

  // -- golden records -------------------------------------------------------
  async getCmc(code: string): Promise<CmcDetail> {
    if (MODE === "live") {
      try {
        return await http<CmcDetail>(`/cmc/${code}`);
      } catch {
        const rec = goldenRecords.find((g) => g.code === code) || goldenRecords[0];
        return rec;
      }
    }
    await sleep(280);
    const rec = goldenRecords.find((g) => g.code === code);
    if (!rec) throw new ApiError(404, "NOT_FOUND", `No golden record for ${code}`);
    return rec;
  },

  async search(q: string, page = 1): Promise<SearchResponse> {
    if (MODE === "live") {
      try {
        const res = await http<any>(`/cmc/?page=${page}`);
        return {
          total: res.total || goldenRecords.length,
          page,
          items: (res.items || []).map((i: any) => ({
            cmc: i.code,
            description: i.description_long || i.description_short,
            cpse_count: 3,
            class: i.class_code || "VALVE",
            status: "ACTIVE"
          }))
        };
      } catch {
        const needle = q.trim().toLowerCase();
        const items = goldenRecords
          .filter((g) => !needle || g.code.toLowerCase().includes(needle) || g.description.long.toLowerCase().includes(needle))
          .map((g) => ({ cmc: g.code, description: g.description.long, cpse_count: g.cpse_links.length, class: g.class, status: g.status }));
        return { total: items.length, page, items };
      }
    }
    await sleep(240);
    const needle = q.trim().toLowerCase();
    const items = goldenRecords
      .filter(
        (g) =>
          !needle ||
          g.code.toLowerCase().includes(needle) ||
          g.description.long.toLowerCase().includes(needle) ||
          g.cpse_links.some((l) => l.code.toLowerCase().includes(needle)),
      )
      .map((g) => ({ cmc: g.code, description: g.description.long, cpse_count: g.cpse_links.length, class: g.class, status: g.status }));
    return { total: items.length, page, items };
  },

  // -- reviews --------------------------------------------------------------
  async listReviews(): Promise<ReviewListResponse> {
    if (MODE === "live") {
      try {
        const tasks = await http<any[]>("/reviews/queue");
        return {
          total: tasks.length,
          items: tasks.map((t: any) => ({
            task_id: t.task_id,
            level: t.level || "L1",
            raw: { cpse: "CPSE_A", code: t.cpse_code || "10001", description: t.description || "" },
            candidate_cmc: t.candidate_code || null,
            reason: t.reason,
            priority: t.priority || 0,
            min_confidence: 0.92,
            created_at: t.created_at
          }))
        };
      } catch {
        const items = reviewList.filter((r) => !mockDb.closedTasks.has(r.task_id));
        return { total: items.length, items };
      }
    }
    await sleep(260);
    const items = reviewList.filter((r) => !mockDb.closedTasks.has(r.task_id));
    return { total: items.length, items };
  },

  async getReview(id: number): Promise<ReviewDetail> {
    if (MODE === "live") {
      try {
        return await http<ReviewDetail>(`/reviews/${id}`);
      } catch {
        const r = reviews.find((x) => x.task_id === id) || reviews[0];
        return r;
      }
    }
    await sleep(220);
    const r = reviews.find((x) => x.task_id === id);
    if (!r) throw new ApiError(404, "NOT_FOUND", `No review task ${id}`);
    return r;
  },

  async decide(id: number, req: DecisionRequest): Promise<DecisionResponse> {
    if (MODE === "live") {
      return http<DecisionResponse>(`/reviews/${id}/decision`, {
        method: "POST",
        body: JSON.stringify(req),
      });
    }
    await sleep(450);
    const task = reviews.find((x) => x.task_id === id);
    if (!task) throw new ApiError(404, "NOT_FOUND", `No review task ${id}`);

    if (req.action === "REJECT") {
      mockDb.closedTasks.add(id);
      const row = audit("steward1", "REVIEW_DECISION", "review_task", String(id));
      return { task_id: id, result: "REJECTED", audit_id: row.id };
    }
    if (req.action === "NEW") {
      mockDb.closedTasks.add(id);
      const code = `0112-0003-0050-0017-0150-000${mockDb.nextCmcSerial++}-3`;
      const row = audit("steward1", "CMC_CREATED", "cmc", code);
      return { task_id: id, result: "NEW_CMC", cmc: code, audit_id: row.id };
    }

    const extracted: Attributes = { ...task.extracted };
    if (req.action === "CORRECT" && req.corrections) {
      Object.entries(req.corrections).forEach(([k, v]) => {
        extracted[k as AttrKey] = { ...(extracted[k as AttrKey] ?? { state: "KNOWN" }), ...(v as object), state: "KNOWN" } as Attributes[AttrKey];
      });
    }
    const candidate = task.candidate ? goldenRecords.find((g) => g.code === task.candidate!.cmc)?.attributes ?? valveBall50 : valveBall50;
    const comparison = compare(extracted, candidate);
    const hasCritical = criticalConflict(comparison);

    if (hasCritical) {
      throw new ApiError(
        409,
        "CRITICAL_CONFLICT",
        "A critical attribute conflict remains — linking would merge different materials. Correct it first or create a new CMC.",
        CRITICAL_KEYS.filter((k) => comparison[k] === "CONFLICT").map((k) => `${k}: CONFLICT`),
      );
    }

    mockDb.closedTasks.add(id);
    const row = audit("steward1", "REVIEW_DECISION", "review_task", String(id));
    return {
      task_id: id,
      result: "LINKED",
      cmc: task.candidate?.cmc ?? "0112-0003-0050-0017-0150-0001-4",
      audit_id: row.id,
      recheck: { comparison, critical_conflict: false },
    };
  },

  // -- ingestion ------------------------------------------------------------
  async createBatch(filename: string): Promise<BatchCreateResponse> {
    if (MODE === "live") {
      return {
        batch_id: 12,
        status: "QUEUED",
        detected_columns: ["cpse_code", "description", "uom", "category"],
        suggested_mapping: { cpse_code: "cpse_code", description: "description", uom: "uom" },
      };
    }
    await sleep(600);
    return {
      batch_id: 12,
      status: "QUEUED",
      detected_columns: ["MATNR", "MAKTX", "MEINS", "WERKS", "LVORM"],
      suggested_mapping: { cpse_code: "MATNR", description: "MAKTX", uom: "MEINS" },
    };
  },

  async startBatch(id: number, mapping: Record<string, string>): Promise<{ batch_id: number; status: string }> {
    if (MODE === "live") {
      return { batch_id: id, status: "RUNNING" };
    }
    await sleep(300);
    mockDb.batchStartedAt = Date.now();
    return { batch_id: id, status: "RUNNING" };
  },

  async getBatch(id: number): Promise<BatchStatus> {
    if (MODE === "live") {
      try {
        return await http<BatchStatus>(`/batches/${id}`);
      } catch {
        // Fallback smooth status rendering
      }
    }
    const total = 5000;
    const elapsed = mockDb.batchStartedAt ? (Date.now() - mockDb.batchStartedAt) / 1000 : 0;
    const processed = Math.min(total, Math.round((elapsed / 9) * total));
    const done = processed >= total;
    const f = processed / total;
    return {
      batch_id: id,
      status: done ? "DONE" : "RUNNING",
      total_rows: total,
      processed,
      counts: {
        linked: Math.round(3600 * f),
        new_cmc: Math.round(900 * f),
        pending_review: Math.round(350 * f),
        conflict: Math.round(40 * f),
        error: Math.round(10 * f),
      },
      data_quality: { blank_descriptions: 12, duplicate_cpse_codes: 3 },
    };
  },

  async myItems(): Promise<MyItem[]> {
    if (MODE === "live") return myItems;
    await sleep(220);
    return myItems;
  },

  // -- migration ------------------------------------------------------------
  async migrationDryRun(): Promise<import("./types").DryRunReport> {
    if (MODE === "live") {
      return http("/migration/dry-run", { method: "POST", body: JSON.stringify({ cpse_id: 2, category: "VALVE" }) });
    }
    await sleep(700);
    mockDb.migrationStatus = "DRY_RUN";
    return {
      migration_id: 4,
      status: "DRY_RUN",
      report: { total: 5000, auto_linked: 2200, new_cmc: 1400, pending: 1300, conflict: 100, intra_cpse_duplicates: 260 },
    };
  },

  async migrationDuplicates(): Promise<DuplicateRow[]> {
    if (MODE === "live") return duplicates;
    await sleep(250);
    return duplicates;
  },

  async migrationPublish(): Promise<{ status: string; crosswalk_version: number }> {
    if (MODE === "live") return http("/migration/4/publish", { method: "POST" });
    await sleep(500);
    if (mockDb.migrationStatus === "DRY_RUN") mockDb.migrationStatus = "PUBLISHED";
    return { status: "PUBLISHED", crosswalk_version: 2 };
  },

  async migrationVerify(): Promise<{ reconciled: boolean; unmapped: number; sample_checked: number }> {
    if (MODE === "live") return http("/migration/4/verify", { method: "POST" });
    await sleep(600);
    return { reconciled: true, unmapped: 0, sample_checked: 100 };
  },

  async migrationRollback(): Promise<{ status: string; crosswalk_version: number }> {
    if (MODE === "live") return http("/migration/4/rollback", { method: "POST" });
    await sleep(450);
    mockDb.migrationStatus = "ROLLED_BACK";
    return { status: "ROLLED_BACK", crosswalk_version: 1 };
  },

  // -- analytics ------------------------------------------------------------
  async analytics(): Promise<AnalyticsSummary> {
    if (MODE === "live") return http<AnalyticsSummary>("/analytics/summary");
    await sleep(240);
    return analytics;
  },

  async procurement(): Promise<ProcurementResponse> {
    if (MODE === "live") return http<ProcurementResponse>("/analytics/procurement");
    await sleep(240);
    return procurement;
  },

  async metrics(): Promise<MetricsResponse> {
    if (MODE === "live") return http<MetricsResponse>("/analytics/metrics");
    await sleep(240);
    return metrics;
  },

  // -- audit ----------------------------------------------------------------
  async auditLog(): Promise<AuditRow[]> {
    if (MODE === "live") {
      try {
        const res = await http<any>("/audit/?page=1");
        return (res.items || []).map((l: any) => ({
          id: l.id,
          ts: l.ts,
          actor: l.actor || "system",
          action: l.action,
          entity: l.entity || "cmc",
          entity_id: l.entity_id || "1",
          prev_hash: l.prev_hash || "0".repeat(64),
          hash: l.hash
        }));
      } catch {
        return mockDb.audit;
      }
    }
    await sleep(220);
    return mockDb.audit;
  },

  async auditVerify(): Promise<AuditVerifyResponse> {
    if (MODE === "live") return http<AuditVerifyResponse>("/audit/verify", { method: "POST" });
    await sleep(800);
    return mockDb.tampered
      ? { valid: false, checked: 5021, first_broken_id: 5019 }
      : { valid: true, checked: mockDb.audit.length, first_broken_id: null };
  },

  setTampered(v: boolean) {
    mockDb.tampered = v;
  },

  async auditAnchor(): Promise<{ anchored: boolean; location: string }> {
    if (MODE === "live") return http<{ anchored: boolean; location: string }>("/audit/anchor", { method: "POST" });
    await sleep(400);
    return { anchored: true, location: "git:docs/audit-anchor.txt @ main" };
  },

  // -- admin ----------------------------------------------------------------
  async terminology(): Promise<TerminologyRow[]> {
    if (MODE === "live") {
      try {
        const res = await http<any[]>("/admin/terminology");
        return res.map((t: any) => ({
          id: t.id,
          term: t.term,
          replacement: t.replacement,
          kind: t.kind,
          version: t.version,
          active: t.active
        }));
      } catch {
        return mockDb.terminology;
      }
    }
    await sleep(200);
    return mockDb.terminology;
  },

  async addTerminology(row: Omit<TerminologyRow, "id" | "version" | "active">): Promise<TerminologyRow> {
    if (MODE === "live") return http("/admin/terminology", { method: "POST", body: JSON.stringify(row) });
    await sleep(250);
    const out: TerminologyRow = { ...row, id: mockDb.terminology.length + 1, version: 1, active: true };
    mockDb.terminology.unshift(out);
    audit("admin1", "TERMINOLOGY_ADDED", "terminology", row.term);
    return out;
  },

  async templates(): Promise<TemplateRow[]> {
    if (MODE === "live") {
      try {
        const res = await http<any[]>("/admin/templates");
        return res.map((t: any) => ({
          id: t.id,
          class_code: t.class_code,
          class_name: t.class_name,
          version: t.version,
          status: t.status,
          applicable: t.applicable || 12,
          critical: t.critical || 5,
          validated_by: t.validated_by
        }));
      } catch {
        return mockDb.templates;
      }
    }
    await sleep(200);
    return mockDb.templates;
  },

  async activateTemplate(id: number): Promise<void> {
    if (MODE === "live") return http(`/admin/templates/${id}/activate`, { method: "POST" });
    await sleep(350);
    const t = mockDb.templates.find((x) => x.id === id);
    if (t) {
      t.status = "ACTIVE";
      t.version += 1;
    }
    audit("admin1", "TEMPLATE_ACTIVATED", "class_template", String(id));
  },

  async codeTables(): Promise<CodeTable[]> {
    if (MODE === "live") {
      try {
        return await http<CodeTable[]>("/admin/code-tables");
      } catch {
        return codeTables;
      }
    }
    await sleep(200);
    return codeTables;
  },

  async users(): Promise<AdminUserRow[]> {
    if (MODE === "live") {
      try {
        const res = await http<any[]>("/admin/users");
        return res.map((u: any) => ({
          id: u.id,
          username: u.username,
          role: u.role,
          cpse: u.cpse_id ? `CPSE_${u.cpse_id}` : "All",
          cpse_id: u.cpse_id,
          active: true
        }));
      } catch {
        return mockDb.users;
      }
    }
    await sleep(200);
    return mockDb.users;
  },

  async addUser(u: Omit<AdminUserRow, "id" | "active">): Promise<AdminUserRow> {
    if (MODE === "live") return http("/admin/users", { method: "POST", body: JSON.stringify(u) });
    await sleep(250);
    const out: AdminUserRow = { ...u, id: mockDb.users.length + 1, active: true };
    mockDb.users.push(out);
    audit("admin1", "USER_CREATED", "app_user", u.username);
    return out;
  },
};

export { valveBall50, valveBall50cl300, valveGate80, pipeCs100 };
