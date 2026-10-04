// ---------------------------------------------------------------------------
// National Material Identity Platform — contract types (contracts §2)
// Shapes mirror detailed_plan.md exactly. Change only via contracts PR.
// ---------------------------------------------------------------------------

export type Role = "UPLOADER" | "STEWARD" | "APPROVER" | "ADMIN" | "AUDITOR";

export interface User {
  id: number;
  username: string;
  role: Role;
  cpse_id: number | null;
}

export interface LoginResponse {
  token: string;
  expires_in: number;
  user: User;
}

// ---- Attribute model (20 fixed dimensions) --------------------------------

export const ATTR_KEYS = [
  "type",
  "primary_size",
  "length",
  "thickness",
  "material",
  "secondary_material",
  "pressure",
  "temperature",
  "flow",
  "electrical",
  "mechanical_loading",
  "stiffness_hardness",
  "connection",
  "actuation",
  "standard",
  "protection",
  "measurement",
  "coating",
  "manufacturer_part",
  "uom",
] as const;

export type AttrKey = (typeof ATTR_KEYS)[number];
export type AttrState = "KNOWN" | "UNKNOWN" | "NA";
export type Verdict = "MATCH" | "CONFLICT" | "UNKNOWN";

export interface AttrValue {
  value?: string;
  unit?: string;
  code?: string;
  state: AttrState;
  confidence?: number;
  source_span?: string;
}

export type Attributes = Partial<Record<AttrKey, AttrValue>>;

export const ATTR_LABELS: Record<AttrKey, string> = {
  type: "Type",
  primary_size: "Primary size",
  length: "Length / 2nd dimension",
  thickness: "Thickness / schedule",
  material: "Material & grade",
  secondary_material: "Secondary material",
  pressure: "Pressure / rating",
  temperature: "Temperature",
  flow: "Flow / capacity",
  electrical: "Electrical",
  mechanical_loading: "Mechanical loading",
  stiffness_hardness: "Stiffness / hardness",
  connection: "Connection / end",
  actuation: "Actuation",
  standard: "Governing standard",
  protection: "Protection / certification",
  measurement: "Measurement",
  coating: "Surface / coating",
  manufacturer_part: "Manufacturer / part",
  uom: "Unit of measure",
};

/** Dimensions that decide identity for the demo classes (valve template v3). */
export const CRITICAL_KEYS: AttrKey[] = [
  "type",
  "primary_size",
  "pressure",
  "material",
  "connection",
];

// ---- Search-Before-Create (hero) ------------------------------------------

export type CheckOutcome = "EXISTING" | "NO_MATCH" | "NEEDS_INFO";

export interface StandardDescription {
  short: string;
  long: string;
  draft: boolean;
}

export interface CheckResponse {
  outcome: CheckOutcome;
  standard_description: StandardDescription;
  attributes: Attributes;
  missing_critical: AttrKey[];
  match?: {
    cmc: string;
    linked_cpse_codes: { cpse: string; code: string }[];
    evidence: Partial<Record<AttrKey, Verdict>>;
  };
  similar: { cmc: string; description: string; score: number }[];
}

export type RequestNewOutcome = "NEW_CMC" | "PENDING_REVIEW";

export interface RequestNewResponse {
  outcome: RequestNewOutcome;
  cmc?: string;
  review_task_id?: number;
}

// ---- Golden records -------------------------------------------------------

export interface CmcDetail {
  code: string;
  status: "ACTIVE" | "SUPERSEDED";
  superseded_by: string | null;
  class: string;
  subclass: string;
  description: { short: string; long: string };
  attributes: Attributes;
  cpse_links: {
    cpse: string;
    code: string;
    relationship: "EXACT" | "POTENTIAL" | "PENDING";
    decision_source: "AUTO" | "HUMAN";
    raw_description: string;
  }[];
  related: { cmc: string; type: string; status: string }[];
  history: { ts: string; action: string; actor: string }[];
  procurement?: {
    pooled_qty: number;
    min_price: number;
    max_price: number;
    synthetic: boolean;
  };
}

export interface SearchHit {
  cmc: string;
  description: string;
  cpse_count: number;
  class?: string;
  status?: "ACTIVE" | "SUPERSEDED";
}

export interface SearchResponse {
  total: number;
  page: number;
  items: SearchHit[];
}

// ---- Review / workbench ---------------------------------------------------

export type ReviewReason =
  | "INCOMPLETE"
  | "LOW_CONFIDENCE"
  | "CONFLICT"
  | "FUNCTIONAL_EQUIV";

export interface ReviewListItem {
  task_id: number;
  reason: ReviewReason;
  priority: number;
  level: "L1" | "L2";
  raw: { cpse: string; code: string; description: string };
  candidate_cmc: string | null;
  min_confidence: number;
}

export interface ReviewListResponse {
  total: number;
  items: ReviewListItem[];
}

export interface ReviewDetail {
  task_id: number;
  reason: ReviewReason;
  level: "L1" | "L2";
  priority: number;
  raw: { cpse: string; code: string; description: string };
  extracted: Attributes;
  candidate: { cmc: string; attributes: Attributes } | null;
  comparison: Partial<Record<AttrKey, Verdict>>;
  model_version: string;
  template_version: number;
}

export type DecisionAction = "APPROVE" | "REJECT" | "CORRECT" | "NEW";

export interface DecisionRequest {
  action: DecisionAction;
  corrections?: Attributes;
  note?: string;
}

export interface DecisionResponse {
  task_id: number;
  result: "LINKED" | "NEW_CMC" | "PENDING_REVIEW" | "REJECTED";
  cmc?: string;
  audit_id: number;
  recheck?: {
    comparison: Partial<Record<AttrKey, Verdict>>;
    critical_conflict: boolean;
  };
}

// ---- Ingestion ------------------------------------------------------------

export interface BatchCreateResponse {
  batch_id: number;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  detected_columns: string[];
  suggested_mapping: Record<string, string>;
}

export interface BatchStatus {
  batch_id: number;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  total_rows: number;
  processed: number;
  counts: {
    linked: number;
    new_cmc: number;
    pending_review: number;
    conflict: number;
    error: number;
  };
  data_quality: { blank_descriptions: number; duplicate_cpse_codes: number };
}

export interface MyItem {
  cpse_code: string;
  description: string;
  cmc: string | null;
  status: "LINKED" | "NEW_CMC" | "PENDING_REVIEW" | "CONFLICT";
  batch: string;
}

// ---- Migration ------------------------------------------------------------

export interface DryRunReport {
  migration_id: number;
  status: "DRY_RUN" | "IN_REVIEW" | "PUBLISHED" | "VERIFIED" | "ROLLED_BACK";
  report: {
    total: number;
    auto_linked: number;
    new_cmc: number;
    pending: number;
    conflict: number;
    intra_cpse_duplicates: number;
  };
}

export interface DuplicateRow {
  cpse_code_a: string;
  cpse_code_b: string;
  description: string;
  keep: string;
  reason: string;
}

// ---- Analytics ------------------------------------------------------------

export interface AnalyticsSummary {
  records: number;
  cmcs: number;
  duplicates_found: number;
  review_rate: number;
  auto_resolved_rate: number;
  by_category: { class: string; records: number; cmcs: number }[];
}

export interface ProcurementItem {
  cmc: string;
  pooled_qty: number;
  cpse_breakdown: { cpse: string; qty: number; price: number }[];
  price_spread_saving_upper_bound: number;
  formula: string;
}

export interface ProcurementResponse {
  synthetic: boolean;
  items: ProcurementItem[];
  surplus_matches: { cmc: string; from: string; to: string; qty: number }[];
}

export interface MetricRow {
  attribute: string;
  baseline: number;
  model: number;
  n: number;
}

export interface MetricsResponse {
  run: string;
  dataset: string;
  sample_size: number;
  per_attribute: MetricRow[];
  false_merge_rate: number;
  false_split_rate: number;
  auto_resolved_rate: number;
}

// ---- Audit ----------------------------------------------------------------

export interface AuditRow {
  id: number;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  prev_hash: string;
  hash: string;
  evidence?: Record<string, string>;
}

export interface AuditVerifyResponse {
  valid: boolean;
  checked: number;
  first_broken_id: number | null;
}

// ---- Admin reference data -------------------------------------------------

export interface TerminologyRow {
  id: number;
  term: string;
  replacement: string;
  kind: "ABBREVIATION" | "UNIT" | "RATING" | "MATERIAL" | "SYNONYM";
  version: number;
  active: boolean;
}

export interface TemplateRow {
  id: number;
  class_code: string;
  class_name: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "RETIRED";
  validated_by: string | null;
  critical: AttrKey[];
  applicable: AttrKey[];
}

export interface CodeTableValue {
  code: string;
  label: string;
  canonical: string;
  status: "ACTIVE" | "RETIRED";
}

export interface CodeTable {
  name: string;
  values: CodeTableValue[];
}

export interface AdminUserRow {
  id: number;
  username: string;
  role: Role;
  cpse: string | null;
  active: boolean;
}

// ---- Error envelope -------------------------------------------------------

export interface ApiError {
  error: { code: string; message: string; details: string[] };
}
