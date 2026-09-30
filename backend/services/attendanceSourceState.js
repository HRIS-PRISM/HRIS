/**
 * Adds `source_state` to attendance_result rows:
 *  - "active"  — the deduction / earning the row came from is still in effect;
 *  - "voided"  — that source was voided or rejected (e.g. Leave Assignment → Void);
 *  - "missing" — that source row no longer exists.
 * Rows whose source kind is not tracked (manual, salary, direct keys) are "active".
 */
const db = require("../db");

const SOURCE_TABLES = {
  LEAVE_EARNING: { table: "leave_earnings", voided: "(voided_at IS NOT NULL OR COALESCE(voided,0)=1 OR earn_status='rejected')" },
  LEAVE_CREDIT_USAGE: { table: "leave_credit_usage", voided: "(voided_at IS NOT NULL)" },
  HALF_DAY_DDL: { table: "deduction_decision_log", voided: "(decision IN ('voided','rejected'))" },
  SC_EARNING: { table: "sc_earnings", voided: "(voided_at IS NOT NULL OR COALESCE(voided,0)=1 OR earn_status='rejected')" },
  CTO_EARNING: { table: "cto_earnings", voided: "(voided_at IS NOT NULL OR COALESCE(voided,0)=1 OR earn_status='rejected')" },
  SC_SERVICE_CREDIT: { table: "service_credit", voided: "(voided_at IS NOT NULL)" },
  CTO_SERVICE_CREDIT: { table: "cto_credit", voided: "(voided_at IS NOT NULL)" },
};

const queryP = (sql, params) =>
  new Promise((resolve, reject) => db.query(sql, params, (e, r) => (e ? reject(e) : resolve(r || []))));

const parseKey = (sourceKey) => {
  const m = String(sourceKey || "").match(/^([A-Z_]+):(\d+)$/);
  return m && SOURCE_TABLES[m[1]] ? { kind: m[1], id: parseInt(m[2], 10) } : null;
};

async function annotateAttendanceSourceState(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const idsByKind = {};
  for (const r of list) {
    const k = parseKey(r.source_key);
    if (k) (idsByKind[k.kind] = idsByKind[k.kind] || new Set()).add(k.id);
  }
  const state = {};
  await Promise.all(
    Object.entries(idsByKind).map(async ([kind, ids]) => {
      const idList = [...ids];
      if (!idList.length) return;
      const { table, voided } = SOURCE_TABLES[kind];
      const found = await queryP(
        `SELECT id, ${voided} AS is_voided FROM ${table} WHERE id IN (${idList.map(() => "?").join(",")})`,
        idList,
      );
      for (const f of found) state[`${kind}:${f.id}`] = Number(f.is_voided) ? "voided" : "active";
    }),
  );
  return list.map((r) => {
    const k = parseKey(r.source_key);
    return { ...r, source_state: k ? state[`${k.kind}:${k.id}`] || "missing" : "active" };
  });
}

/** Never fails the caller: on error the rows come back untagged (treated as active). */
const annotateSafely = (rows) =>
  annotateAttendanceSourceState(rows).catch((e) => {
    console.error("[attendance-source-state]", e.message);
    return Array.isArray(rows) ? rows : [];
  });

module.exports = { annotateAttendanceSourceState, annotateSafely };
