// ---------------------------------------------------------------------------
// Demo fixtures — realistic valve / pipe / bearing data for mock mode.
// Every shape matches contracts §2 sample responses.
// ---------------------------------------------------------------------------

import type {
  Attributes,
  AuditRow,
  CmcDetail,
  CodeTable,
  MetricsResponse,
  MyItem,
  ProcurementResponse,
  ReviewDetail,
  ReviewListItem,
  TemplateRow,
  TerminologyRow,
  AdminUserRow,
  AnalyticsSummary,
  DuplicateRow,
} from "../lib/types";

const K = (
  value: string | undefined,
  state: "KNOWN" | "UNKNOWN" | "NA",
  opts: Partial<{ unit: string; code: string; confidence: number; source_span: string }> = {},
) => ({ value, state, ...opts });

/** Full 20-dimension set for the flagship golden record. */
export const valveBall50: Attributes = {
  type: K("BALL", "KNOWN", { confidence: 0.98, source_span: "BALL" }),
  primary_size: K("50", "KNOWN", { unit: "MM", code: "0050", confidence: 0.97, source_span: '2 IN"' }),
  length: K(undefined, "NA"),
  thickness: K(undefined, "NA"),
  material: K("SS316", "KNOWN", { code: "0017", confidence: 0.96, source_span: "SS316" }),
  secondary_material: K(undefined, "NA"),
  pressure: K("150", "KNOWN", { unit: "CLASS", code: "0150", confidence: 0.95, source_span: "150#" }),
  temperature: K("180", "KNOWN", { unit: "C", confidence: 0.72, source_span: "—" }),
  flow: K(undefined, "NA"),
  electrical: K(undefined, "NA"),
  mechanical_loading: K(undefined, "NA"),
  stiffness_hardness: K(undefined, "NA"),
  connection: K("FLANGED", "KNOWN", { code: "0002", confidence: 0.93, source_span: "FLG" }),
  actuation: K("MANUAL", "KNOWN", { confidence: 0.88, source_span: "—" }),
  standard: K("ASME B16.34", "KNOWN", { confidence: 0.84, source_span: "—" }),
  protection: K(undefined, "UNKNOWN"),
  measurement: K(undefined, "NA"),
  coating: K(undefined, "UNKNOWN"),
  manufacturer_part: K(undefined, "UNKNOWN"),
  uom: K("EA", "KNOWN", { confidence: 0.99, source_span: "EA" }),
};

export const valveBall50cl300: Attributes = {
  ...valveBall50,
  pressure: K("300", "KNOWN", { unit: "CLASS", code: "0300", confidence: 0.94, source_span: "CL300" }),
};

export const valveGate80: Attributes = {
  ...valveBall50,
  type: K("GATE", "KNOWN", { confidence: 0.97, source_span: "GATE" }),
  primary_size: K("80", "KNOWN", { unit: "MM", code: "0080", confidence: 0.95, source_span: '3"' }),
  actuation: K(undefined, "NA"),
};

export const pipeCs100: Attributes = {
  type: K("PIPE", "KNOWN", { confidence: 0.99, source_span: "PIPE" }),
  primary_size: K("100", "KNOWN", { unit: "MM", code: "0100", confidence: 0.92, source_span: "DN100" }),
  length: K("6", "KNOWN", { unit: "M", confidence: 0.9, source_span: "6M" }),
  thickness: K("SCH 40", "KNOWN", { confidence: 0.87, source_span: "SCH40" }),
  material: K("CS", "KNOWN", { code: "0004", confidence: 0.94, source_span: "CS" }),
  secondary_material: K(undefined, "NA"),
  pressure: K(undefined, "NA"),
  temperature: K(undefined, "NA"),
  flow: K(undefined, "NA"),
  electrical: K(undefined, "NA"),
  mechanical_loading: K(undefined, "NA"),
  stiffness_hardness: K(undefined, "NA"),
  connection: K("BEVELLED", "KNOWN", { confidence: 0.81, source_span: "BEV" }),
  actuation: K(undefined, "NA"),
  standard: K("ASTM A106 Gr.B", "KNOWN", { confidence: 0.89, source_span: "A106" }),
  protection: K(undefined, "UNKNOWN"),
  measurement: K(undefined, "NA"),
  coating: K("BLACK LACQUER", "KNOWN", { confidence: 0.76, source_span: "BLK" }),
  manufacturer_part: K(undefined, "UNKNOWN"),
  uom: K("M", "KNOWN", { confidence: 0.99, source_span: "M" }),
};

export const bearingBall25: Attributes = {
  type: K("BALL", "KNOWN", { confidence: 0.96, source_span: "BALL" }),
  primary_size: K("25", "KNOWN", { unit: "MM", code: "0025", confidence: 0.94, source_span: "25MM" }),
  length: K(undefined, "NA"),
  thickness: K(undefined, "NA"),
  material: K("BEARING STEEL", "KNOWN", { code: "0011", confidence: 0.83, source_span: "—" }),
  secondary_material: K(undefined, "NA"),
  pressure: K(undefined, "NA"),
  temperature: K("120", "KNOWN", { unit: "C", confidence: 0.7, source_span: "—" }),
  flow: K(undefined, "NA"),
  electrical: K(undefined, "NA"),
  mechanical_loading: K("DYNAMIC 19.5 KN", "KNOWN", { confidence: 0.79, source_span: "19.5KN" }),
  stiffness_hardness: K("62 HRC", "KNOWN", { confidence: 0.82, source_span: "62HRC" }),
  connection: K(undefined, "NA"),
  actuation: K(undefined, "NA"),
  standard: K("DIN 625", "KNOWN", { confidence: 0.86, source_span: "DIN625" }),
  protection: K("2RS", "KNOWN", { confidence: 0.9, source_span: "2RS" }),
  measurement: K(undefined, "NA"),
  coating: K(undefined, "NA"),
  manufacturer_part: K("6205-2RS", "KNOWN", { confidence: 0.97, source_span: "6205-2RS" }),
  uom: K("EA", "KNOWN", { confidence: 0.99, source_span: "EA" }),
};

export const goldenRecords: CmcDetail[] = [
  {
    code: "0112-0003-0050-0017-0150-0001-4",
    status: "ACTIVE",
    superseded_by: null,
    class: "VALVE",
    subclass: "BALL_VALVE",
    description: {
      short: "VALVE,BALL,DN50,CL150,SS316,FLG",
      long: "VALVE, BALL, DN50 (2 IN), CLASS 150, SS316, FLANGED",
    },
    attributes: valveBall50,
    cpse_links: [
      {
        cpse: "CPSE_A",
        code: "1000234567",
        relationship: "EXACT",
        decision_source: "AUTO",
        raw_description: 'VALVE BALL 2" CL150 SS316 FLGD',
      },
      {
        cpse: "CPSE_B",
        code: "70001234",
        relationship: "POTENTIAL",
        decision_source: "HUMAN",
        raw_description: "VLV BALL 2in CL150 SS316 FLG",
      },
      {
        cpse: "CPSE_C",
        code: "30007781",
        relationship: "EXACT",
        decision_source: "AUTO",
        raw_description: "BALL VALVE DN50 150# SS-316 FLANGED",
      },
    ],
    related: [
      {
        cmc: "0112-0002-0080-0017-0150-0001-8",
        type: "FUNCTIONALLY_EQUIVALENT",
        status: "PROPOSED",
      },
      {
        cmc: "0112-0003-0050-0017-0300-0002-1",
        type: "NOT_EQUIVALENT",
        status: "APPROVED",
      },
    ],
    history: [
      { ts: "2026-09-26T10:12:00Z", action: "CREATED", actor: "system" },
      { ts: "2026-09-26T10:12:04Z", action: "LINKED CPSE_A/1000234567", actor: "system" },
      { ts: "2026-09-28T14:41:00Z", action: "LINKED CPSE_B/70001234 (human)", actor: "steward1" },
      { ts: "2026-10-01T09:03:00Z", action: "LINKED CPSE_C/30007781", actor: "system" },
    ],
    procurement: { pooled_qty: 540, min_price: 4200, max_price: 5100, synthetic: true },
  },
  {
    code: "0112-0003-0050-0017-0300-0002-1",
    status: "ACTIVE",
    superseded_by: null,
    class: "VALVE",
    subclass: "BALL_VALVE",
    description: {
      short: "VALVE,BALL,DN50,CL300,SS316,FLG",
      long: "VALVE, BALL, DN50 (2 IN), CLASS 300, SS316, FLANGED",
    },
    attributes: valveBall50cl300,
    cpse_links: [
      {
        cpse: "CPSE_B",
        code: "70004455",
        relationship: "EXACT",
        decision_source: "AUTO",
        raw_description: 'VLV BALL 2" CL300 SS316 FLG',
      },
    ],
    related: [
      {
        cmc: "0112-0003-0050-0017-0150-0001-4",
        type: "NOT_EQUIVALENT",
        status: "APPROVED",
      },
    ],
    history: [
      { ts: "2026-09-27T08:00:00Z", action: "CREATED", actor: "system" },
      { ts: "2026-09-27T08:00:03Z", action: "SAFETY: kept separate from CL150", actor: "system" },
    ],
    procurement: { pooled_qty: 120, min_price: 5600, max_price: 6100, synthetic: true },
  },
  {
    code: "0112-0002-0080-0017-0150-0001-8",
    status: "ACTIVE",
    superseded_by: null,
    class: "VALVE",
    subclass: "GATE_VALVE",
    description: {
      short: "VALVE,GATE,DN80,CL150,SS316,FLG",
      long: "VALVE, GATE, DN80 (3 IN), CLASS 150, SS316, FLANGED",
    },
    attributes: valveGate80,
    cpse_links: [
      {
        cpse: "CPSE_A",
        code: "1000889122",
        relationship: "EXACT",
        decision_source: "AUTO",
        raw_description: 'GATE VLV 3" 150# SS316 FLGD',
      },
    ],
    related: [],
    history: [{ ts: "2026-09-26T11:20:00Z", action: "CREATED", actor: "system" }],
    procurement: { pooled_qty: 86, min_price: 6900, max_price: 7400, synthetic: true },
  },
  {
    code: "0215-0001-0100-0004-0000-0001-6",
    status: "ACTIVE",
    superseded_by: null,
    class: "PIPE",
    subclass: "SEAMLESS_PIPE",
    description: {
      short: "PIPE,CS,DN100,SCH40,6M",
      long: "PIPE, CARBON STEEL, DN100 (4 IN), SCH 40, 6 M, BEVELLED END",
    },
    attributes: pipeCs100,
    cpse_links: [
      {
        cpse: "CPSE_C",
        code: "30011223",
        relationship: "EXACT",
        decision_source: "AUTO",
        raw_description: "PIPE CS DN100 SCH40 6MTR BEV",
      },
      {
        cpse: "CPSE_A",
        code: "1002211998",
        relationship: "EXACT",
        decision_source: "AUTO",
        raw_description: "CS PIPE 4IN SCH40 6M A106-B",
      },
    ],
    related: [],
    history: [{ ts: "2026-09-29T12:00:00Z", action: "CREATED", actor: "system" }],
    procurement: { pooled_qty: 1200, min_price: 890, max_price: 1120, synthetic: true },
  },
  {
    code: "0308-0001-0025-0011-0000-0001-2",
    status: "SUPERSEDED",
    superseded_by: "0308-0001-0025-0012-0000-0001-5",
    class: "BEARING",
    subclass: "BALL_BEARING",
    description: {
      short: "BEARING,BALL,6205-2RS,25MM",
      long: "BEARING, BALL, BORE 25 MM, 6205-2RS, DIN 625",
    },
    attributes: bearingBall25,
    cpse_links: [
      {
        cpse: "CPSE_B",
        code: "70033119",
        relationship: "EXACT",
        decision_source: "HUMAN",
        raw_description: "BRG BALL 6205 2RS 25MM",
      },
    ],
    related: [],
    history: [
      { ts: "2026-09-25T09:00:00Z", action: "CREATED", actor: "system" },
      { ts: "2026-10-02T16:22:00Z", action: "SUPERSEDED (material code correction)", actor: "admin1" },
    ],
    procurement: { pooled_qty: 340, min_price: 420, max_price: 560, synthetic: true },
  },
];

export const reviews: ReviewDetail[] = [
  {
    task_id: 88,
    reason: "CONFLICT",
    level: "L1",
    priority: 5,
    raw: {
      cpse: "CPSE_B",
      code: "70001234",
      description: 'VLV BALL 2in CL300 SS316 FLG',
    },
    extracted: {
      type: K("BALL", "KNOWN", { confidence: 0.98, source_span: "BALL" }),
      primary_size: K("50", "KNOWN", { unit: "MM", code: "0050", confidence: 0.95, source_span: "2in" }),
      material: K("SS316", "KNOWN", { code: "0017", confidence: 0.96, source_span: "SS316" }),
      pressure: K("300", "KNOWN", { unit: "CLASS", code: "0300", confidence: 0.9, source_span: "CL300" }),
      connection: K("FLANGED", "KNOWN", { code: "0002", confidence: 0.92, source_span: "FLG" }),
      uom: K("EA", "KNOWN", { confidence: 0.99, source_span: "EA" }),
    },
    candidate: {
      cmc: "0112-0003-0050-0017-0150-0001-4",
      attributes: valveBall50,
    },
    comparison: {
      type: "MATCH",
      primary_size: "MATCH",
      material: "MATCH",
      pressure: "CONFLICT",
      connection: "MATCH",
      uom: "MATCH",
    },
    model_version: "rules-v1+slm-v1",
    template_version: 3,
  },
  {
    task_id: 91,
    reason: "INCOMPLETE",
    level: "L1",
    priority: 3,
    raw: {
      cpse: "CPSE_A",
      code: "10045567",
      description: "GATE VALVE 4 IN 150# SS316",
    },
    extracted: {
      type: K("GATE", "KNOWN", { confidence: 0.97, source_span: "GATE VALVE" }),
      primary_size: K("100", "KNOWN", { unit: "MM", code: "0100", confidence: 0.93, source_span: "4 IN" }),
      material: K("SS316", "KNOWN", { code: "0017", confidence: 0.94, source_span: "SS316" }),
      pressure: K("150", "KNOWN", { unit: "CLASS", code: "0150", confidence: 0.92, source_span: "150#" }),
      connection: K(undefined, "UNKNOWN"),
      uom: K("EA", "KNOWN", { confidence: 0.99, source_span: "EA" }),
    },
    candidate: {
      cmc: "0112-0002-0080-0017-0150-0001-8",
      attributes: valveGate80,
    },
    comparison: {
      type: "MATCH",
      primary_size: "MATCH",
      material: "MATCH",
      pressure: "MATCH",
      connection: "UNKNOWN",
      uom: "MATCH",
    },
    model_version: "rules-v1+slm-v1",
    template_version: 3,
  },
  {
    task_id: 94,
    reason: "LOW_CONFIDENCE",
    level: "L1",
    priority: 2,
    raw: {
      cpse: "CPSE_C",
      code: "30022112",
      description: "BRG BALL 6205 2RS",
    },
    extracted: {
      type: K("BALL", "KNOWN", { confidence: 0.94, source_span: "BALL" }),
      primary_size: K("25", "KNOWN", { unit: "MM", code: "0025", confidence: 0.62, source_span: "6205" }),
      material: K(undefined, "UNKNOWN"),
      manufacturer_part: K("6205-2RS", "KNOWN", { confidence: 0.96, source_span: "6205 2RS" }),
      protection: K("2RS", "KNOWN", { confidence: 0.9, source_span: "2RS" }),
      uom: K("EA", "KNOWN", { confidence: 0.99, source_span: "EA" }),
    },
    candidate: {
      cmc: "0308-0001-0025-0011-0000-0001-2",
      attributes: bearingBall25,
    },
    comparison: {
      type: "MATCH",
      primary_size: "MATCH",
      material: "UNKNOWN",
      manufacturer_part: "MATCH",
      protection: "MATCH",
      uom: "MATCH",
    },
    model_version: "rules-v1+slm-v1",
    template_version: 1,
  },
  {
    task_id: 96,
    reason: "FUNCTIONAL_EQUIV",
    level: "L2",
    priority: 4,
    raw: {
      cpse: "CPSE_A",
      code: "1002211998",
      description: "CS PIPE 4IN SCH40 6M A106-B",
    },
    extracted: pipeCs100,
    candidate: {
      cmc: "0215-0001-0100-0004-0000-0001-6",
      attributes: pipeCs100,
    },
    comparison: {
      type: "MATCH",
      primary_size: "MATCH",
      thickness: "MATCH",
      material: "MATCH",
      standard: "MATCH",
      uom: "MATCH",
    },
    model_version: "rules-v1+slm-v1",
    template_version: 2,
  },
  {
    task_id: 99,
    reason: "CONFLICT",
    level: "L1",
    priority: 1,
    raw: {
      cpse: "CPSE_C",
      code: "30044110",
      description: "BALL VALVE DN50 150# SS-316 FLANGED PTFE SEAT",
    },
    extracted: {
      ...valveBall50,
      coating: K("PTFE SEAT", "KNOWN", { confidence: 0.85, source_span: "PTFE SEAT" }),
    },
    candidate: {
      cmc: "0112-0003-0050-0017-0150-0001-4",
      attributes: valveBall50,
    },
    comparison: {
      type: "MATCH",
      primary_size: "MATCH",
      material: "MATCH",
      pressure: "MATCH",
      connection: "MATCH",
      coating: "CONFLICT",
    },
    model_version: "rules-v1+slm-v1",
    template_version: 3,
  },
];

export const reviewList: ReviewListItem[] = reviews.map((r) => ({
  task_id: r.task_id,
  reason: r.reason,
  priority: r.priority,
  level: r.level,
  raw: r.raw,
  candidate_cmc: r.candidate?.cmc ?? null,
  min_confidence: Math.min(
    ...Object.values(r.extracted)
      .map((a) => a?.confidence ?? 1)
      .concat(1),
  ),
}));

export const myItems: MyItem[] = [
  {
    cpse_code: "1000234567",
    description: 'VALVE BALL 2" CL150 SS316 FLGD',
    cmc: "0112-0003-0050-0017-0150-0001-4",
    status: "LINKED",
    batch: "catalog_valves_q3.csv",
  },
  {
    cpse_code: "1000889122",
    description: 'GATE VLV 3" 150# SS316 FLGD',
    cmc: "0112-0002-0080-0017-0150-0001-8",
    status: "LINKED",
    batch: "catalog_valves_q3.csv",
  },
  {
    cpse_code: "1002211998",
    description: "CS PIPE 4IN SCH40 6M A106-B",
    cmc: "0215-0001-0100-0004-0000-0001-6",
    status: "LINKED",
    batch: "pipes_sep.csv",
  },
  {
    cpse_code: "10045567",
    description: "GATE VALVE 4 IN 150# SS316",
    cmc: null,
    status: "PENDING_REVIEW",
    batch: "catalog_valves_q3.csv",
  },
  {
    cpse_code: "10099234",
    description: 'VLV BALL 2" CL300 SS316 FLG',
    cmc: null,
    status: "CONFLICT",
    batch: "catalog_valves_q3.csv",
  },
  {
    cpse_code: "10077412",
    description: "STRAINER Y TYPE 150# CS 2IN",
    cmc: null,
    status: "NEW_CMC",
    batch: "misc_oct.csv",
  },
];

export const auditLog: AuditRow[] = [
  {
    id: 5021,
    ts: "2026-10-01T09:03:12Z",
    actor: "system",
    action: "LINKED",
    entity: "crosswalk",
    entity_id: "CPSE_C/30007781",
    prev_hash: "a91f0c4e7b23d84416f0a5c2e8d39b71c05e4a2f8b16d3c90742ee51ba8c0d33",
    hash: "c4d21e0f8a7b95c31e60d4829af5b3c7018d2e64a95b1c8d03f7e246ba915c07",
    evidence: { model_version: "rules-v1+slm-v1", template_version: "3" },
  },
  {
    id: 5020,
    ts: "2026-10-01T09:03:08Z",
    actor: "system",
    action: "CMC_CREATED",
    entity: "cmc",
    entity_id: "0215-0001-0100-0004-0000-0001-6",
    prev_hash: "6b8e12d7a04c9f5321be70d8c4a29f1507de3a6b4c81f029d573ea6c1b04f892",
    hash: "a91f0c4e7b23d84416f0a5c2e8d39b71c05e4a2f8b16d3c90742ee51ba8c0d33",
    evidence: { model_version: "rules-v1+slm-v1", template_version: "2" },
  },
  {
    id: 5019,
    ts: "2026-09-28T14:41:33Z",
    actor: "steward1",
    action: "REVIEW_DECISION",
    entity: "review_task",
    entity_id: "71",
    prev_hash: "03f4a7c2d81b6e9504c3a7d2f8e10b59c4a72d6e3f0b81c95a27d4e6f0b13c82",
    hash: "6b8e12d7a04c9f5321be70d8c4a29f1507de3a6b4c81f029d573ea6c1b04f892",
    evidence: { action: "APPROVE", note: "Verified from datasheet" },
  },
  {
    id: 5018,
    ts: "2026-09-28T14:40:51Z",
    actor: "system",
    action: "REVIEW_OPENED",
    entity: "review_task",
    entity_id: "71",
    prev_hash: "9d2c5e1a7b3048fc621d9e0a5c7b348f01d6e9a2c547b83f016d2e4a9c70b153",
    hash: "03f4a7c2d81b6e9504c3a7d2f8e10b59c4a72d6e3f0b81c95a27d4e6f0b13c82",
    evidence: { reason: "LOW_CONFIDENCE" },
  },
  {
    id: 5017,
    ts: "2026-09-27T08:00:03Z",
    actor: "system",
    action: "CMC_CREATED",
    entity: "cmc",
    entity_id: "0112-0003-0050-0017-0300-0002-1",
    prev_hash: "7a1e83c4d29b05f68e41a3c7d0b2958f36e1c0a4b7d8259f0e31c6a8d45b2079",
    hash: "9d2c5e1a7b3048fc621d9e0a5c7b348f01d6e9a2c547b83f016d2e4a9c70b153",
    evidence: { safety_rule: "critical CONFLICT → separate CMC" },
  },
  {
    id: 5016,
    ts: "2026-09-26T10:12:04Z",
    actor: "system",
    action: "LINKED",
    entity: "crosswalk",
    entity_id: "CPSE_A/1000234567",
    prev_hash: "e50b26d9a3c718f4e052b7d61c3a9840f7e2d15b8c04a93f26d7e10a5b84c261",
    hash: "7a1e83c4d29b05f68e41a3c7d0b2958f36e1c0a4b7d8259f0e31c6a8d45b2079",
  },
  {
    id: 5015,
    ts: "2026-09-26T10:12:00Z",
    actor: "system",
    action: "CMC_CREATED",
    entity: "cmc",
    entity_id: "0112-0003-0050-0017-0150-0001-4",
    prev_hash: "0000000000000000000000000000000000000000000000000000000000000000",
    hash: "e50b26d9a3c718f4e052b7d61c3a9840f7e2d15b8c04a93f26d7e10a5b84c261",
    evidence: { model_version: "rules-v1+slm-v1", template_version: "3" },
  },
];

export const analytics: AnalyticsSummary = {
  records: 15000,
  cmcs: 9100,
  duplicates_found: 5900,
  review_rate: 0.18,
  auto_resolved_rate: 0.74,
  by_category: [
    { class: "VALVE", records: 6000, cmcs: 3200 },
    { class: "PIPE", records: 4200, cmcs: 2600 },
    { class: "BEARING", records: 2800, cmcs: 1900 },
    { class: "FASTENER", records: 1200, cmcs: 900 },
    { class: "CABLE", records: 800, cmcs: 500 },
  ],
};

export const procurement: ProcurementResponse = {
  synthetic: true,
  items: [
    {
      cmc: "0112-0003-0050-0017-0150-0001-4",
      pooled_qty: 540,
      cpse_breakdown: [
        { cpse: "CPSE_A", qty: 200, price: 4200 },
        { cpse: "CPSE_B", qty: 220, price: 4700 },
        { cpse: "CPSE_C", qty: 120, price: 5100 },
      ],
      price_spread_saving_upper_bound: 63000,
      formula: "sum((price_i - min_price) * qty_i)",
    },
    {
      cmc: "0215-0001-0100-0004-0000-0001-6",
      pooled_qty: 1200,
      cpse_breakdown: [
        { cpse: "CPSE_A", qty: 500, price: 890 },
        { cpse: "CPSE_C", qty: 700, price: 1120 },
      ],
      price_spread_saving_upper_bound: 161000,
      formula: "sum((price_i - min_price) * qty_i)",
    },
    {
      cmc: "0308-0001-0025-0011-0000-0001-2",
      pooled_qty: 340,
      cpse_breakdown: [
        { cpse: "CPSE_B", qty: 340, price: 420 },
      ],
      price_spread_saving_upper_bound: 47600,
      formula: "sum((price_i - min_price) * qty_i)",
    },
  ],
  surplus_matches: [
    { cmc: "0112-0002-0080-0017-0150-0001-8", from: "CPSE_C", to: "CPSE_A", qty: 40 },
    { cmc: "0215-0001-0100-0004-0000-0001-6", from: "CPSE_B", to: "CPSE_C", qty: 120 },
  ],
};

export const metrics: MetricsResponse = {
  run: "model_v1",
  dataset: "test_real",
  sample_size: 420,
  per_attribute: [
    { attribute: "type", baseline: 0.96, model: 0.98, n: 420 },
    { attribute: "primary_size", baseline: 0.93, model: 0.97, n: 420 },
    { attribute: "material", baseline: 0.9, model: 0.94, n: 418 },
    { attribute: "pressure", baseline: 0.92, model: 0.96, n: 401 },
    { attribute: "connection", baseline: 0.82, model: 0.88, n: 386 },
    { attribute: "standard", baseline: 0.78, model: 0.85, n: 310 },
  ],
  false_merge_rate: 0.001,
  false_split_rate: 0.04,
  auto_resolved_rate: 0.74,
};

export const terminology: TerminologyRow[] = [
  { id: 1, term: "VLV", replacement: "VALVE", kind: "ABBREVIATION", version: 3, active: true },
  { id: 2, term: "FLGD", replacement: "FLANGED", kind: "ABBREVIATION", version: 3, active: true },
  { id: 3, term: "FLG", replacement: "FLANGED", kind: "ABBREVIATION", version: 3, active: true },
  { id: 4, term: "CL", replacement: "CLASS", kind: "RATING", version: 2, active: true },
  { id: 5, term: "#", replacement: "CLASS", kind: "RATING", version: 2, active: true },
  { id: 6, term: "IN", replacement: "INCH", kind: "UNIT", version: 1, active: true },
  { id: 7, term: "MTR", replacement: "M", kind: "UNIT", version: 1, active: true },
  { id: 8, term: "SS", replacement: "STAINLESS STEEL", kind: "MATERIAL", version: 4, active: true },
  { id: 9, term: "BRG", replacement: "BEARING", kind: "ABBREVIATION", version: 1, active: true },
  { id: 10, term: "SCH", replacement: "SCHEDULE", kind: "SYNONYM", version: 1, active: true },
];

export const templates: TemplateRow[] = [
  {
    id: 1,
    class_code: "0112",
    class_name: "VALVE",
    version: 3,
    status: "ACTIVE",
    validated_by: "R. Deshmukh (retd. engineer, HPCL)",
    critical: ["type", "primary_size", "pressure", "material", "connection"],
    applicable: ["type", "primary_size", "pressure", "material", "connection", "temperature", "actuation", "standard", "uom"],
  },
  {
    id: 2,
    class_code: "0215",
    class_name: "PIPE",
    version: 2,
    status: "ACTIVE",
    validated_by: "R. Deshmukh (retd. engineer, HPCL)",
    critical: ["type", "primary_size", "thickness", "material"],
    applicable: ["type", "primary_size", "length", "thickness", "material", "standard", "coating", "connection", "uom"],
  },
  {
    id: 3,
    class_code: "0308",
    class_name: "BEARING",
    version: 1,
    status: "DRAFT",
    validated_by: null,
    critical: ["type", "primary_size", "manufacturer_part"],
    applicable: ["type", "primary_size", "material", "protection", "manufacturer_part", "mechanical_loading", "stiffness_hardness", "standard", "uom"],
  },
];

export const codeTables: CodeTable[] = [
  {
    name: "subclass_valve",
    values: [
      { code: "0001", label: "GATE", canonical: "GATE", status: "ACTIVE" },
      { code: "0002", label: "GLOBE", canonical: "GLOBE", status: "ACTIVE" },
      { code: "0003", label: "BALL", canonical: "BALL", status: "ACTIVE" },
      { code: "0004", label: "CHECK", canonical: "CHECK", status: "ACTIVE" },
      { code: "0005", label: "BUTTERFLY", canonical: "BUTTERFLY", status: "RETIRED" },
    ],
  },
  {
    name: "material",
    values: [
      { code: "0004", label: "CS", canonical: "CARBON STEEL", status: "ACTIVE" },
      { code: "0011", label: "BEARING STEEL", canonical: "BEARING STEEL", status: "ACTIVE" },
      { code: "0017", label: "SS316", canonical: "STAINLESS STEEL 316", status: "ACTIVE" },
      { code: "0021", label: "SS304", canonical: "STAINLESS STEEL 304", status: "ACTIVE" },
      { code: "0022", label: "SS316L", canonical: "STAINLESS STEEL 316L", status: "ACTIVE" },
    ],
  },
  {
    name: "pressure",
    values: [
      { code: "0000", label: "N/A", canonical: "NA", status: "ACTIVE" },
      { code: "0150", label: "CL150", canonical: "150", status: "ACTIVE" },
      { code: "0300", label: "CL300", canonical: "300", status: "ACTIVE" },
      { code: "0600", label: "CL600", canonical: "600", status: "ACTIVE" },
    ],
  },
  {
    name: "size",
    values: [
      { code: "0025", label: "DN25", canonical: "25", status: "ACTIVE" },
      { code: "0050", label: "DN50", canonical: "50", status: "ACTIVE" },
      { code: "0080", label: "DN80", canonical: "80", status: "ACTIVE" },
      { code: "0100", label: "DN100", canonical: "100", status: "ACTIVE" },
    ],
  },
];

export const adminUsers: AdminUserRow[] = [
  { id: 1, username: "admin1", role: "ADMIN", cpse: null, active: true },
  { id: 2, username: "uploader1", role: "UPLOADER", cpse: "CPSE_A", active: true },
  { id: 3, username: "steward1", role: "STEWARD", cpse: null, active: true },
  { id: 4, username: "approver1", role: "APPROVER", cpse: null, active: true },
  { id: 5, username: "auditor1", role: "AUDITOR", cpse: null, active: true },
  { id: 6, username: "uploader2", role: "UPLOADER", cpse: "CPSE_B", active: true },
];

export const duplicates: DuplicateRow[] = [
  {
    cpse_code_a: "1000234567",
    cpse_code_b: "1000234571",
    description: 'VALVE BALL 2" CL150 SS316 FLGD',
    keep: "1000234567",
    reason: "Older code, 200 movements booked",
  },
  {
    cpse_code_a: "10088122",
    cpse_code_b: "10088123",
    description: "GATE VLV 3IN 150# SS316",
    keep: "10088122",
    reason: "Linked to open PO",
  },
  {
    cpse_code_a: "30011223",
    cpse_code_b: "30011228",
    description: "PIPE CS DN100 SCH40 6MTR",
    keep: "30011223",
    reason: "Duplicate created during ERP migration",
  },
];
