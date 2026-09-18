import { z } from "zod";
import type { Attendance, Rules, State } from "./types";

export const criteriaSchema = z
  .array(
    z.object({
      id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
      name: z.string().trim().min(2).max(100),
    }),
  )
  .min(1)
  .max(20)
  .refine(
    (items) => new Set(items.map((c) => c.id)).size === items.length,
    "ID kriteria tidak boleh berulang.",
  )
  .refine(
    (items) =>
      new Set(items.map((c) => c.name.toLocaleLowerCase("id"))).size ===
      items.length,
    "Nama kriteria tidak boleh berulang.",
  );
export const referenceCriteria = [
  { id: "pbb", name: "PBB" },
  { id: "disiplin", name: "Sikap & disiplin" },
  { id: "fisik", name: "Fisik" },
  { id: "kekompakan", name: "Kekompakan" },
  { id: "kepemimpinan", name: "Kepemimpinan" },
  { id: "pengetahuan", name: "Pengetahuan Paskibra" },
];
export function evaluation(a: Attendance, rules: Rules) {
  const components = rules.criteria?.length
    ? rules.criteria.map((c) => ({
        ...c,
        max: 100,
        value: a.scores?.[c.id] ?? null,
      }))
    : [
        {
          id: "activity",
          name: "Keaktifan (skala lama)",
          max: rules.activity,
          value: a.activity,
        },
        {
          id: "skill",
          name: "Keterampilan (skala lama)",
          max: rules.skill,
          value: a.skill,
        },
      ];
  const applicable = ["hadir", "terlambat"].includes(a.status);
  const total = applicable
    ? components.reduce((n, c) => n + (c.value ?? 0), 0)
    : 0;
  const max = applicable ? components.reduce((n, c) => n + c.max, 0) : 0;
  return {
    components,
    total,
    max,
    complete: !applicable || components.every((c) => c.value !== null),
    assessed: applicable
      ? components.filter((c) => c.value !== null).length
      : 0,
  };
}
export function attendanceTotal(a: Attendance, rules: Rules) {
  const values = evaluation(a, rules);
  return {
    ...values,
    total:
      values.total +
      (a.status === "hadir"
        ? rules.present
        : a.status === "terlambat"
          ? rules.late
          : 0),
  };
}
export function parseScores(input: unknown, rules: Rules) {
  const record = z
    .record(
      z.string(),
      z
        .number()
        .int()
        .min(0, "Nilai minimal 0.")
        .max(100, "Nilai maksimal 100.")
        .nullable(),
    )
    .parse(input);
  const ids = (rules.criteria ?? []).map((c) => c.id);
  if (Object.keys(record).some((id) => !ids.includes(id)))
    throw new Error("Kriteria penilaian tidak dikenal.");
  return Object.fromEntries(ids.map((id) => [id, record[id] ?? null]));
}
export function evaluationSummary(
  state: State,
  memberId: string,
  month: string,
) {
  const rules = state.rules.find((r) => r.month === month);
  const records = state.attendance.filter(
    (a) =>
      a.member_id === memberId &&
      ["hadir", "terlambat"].includes(a.status) &&
      state.sessions.some(
        (t) =>
          t.id === a.session_id &&
          t.date.startsWith(month) &&
          t.status !== "dibatalkan",
      ),
  );
  const values = rules ? records.map((a) => evaluation(a, rules)) : [];
  const total = values.reduce((n, v) => n + v.total, 0);
  const max = values.reduce((n, v) => n + v.max, 0);
  const assessed = values.reduce((n, v) => n + v.assessed, 0);
  const missing = values.reduce(
    (n, v) => n + v.components.length - v.assessed,
    0,
  );
  return {
    total,
    max,
    assessed,
    missing,
    percentage:
      max > 0 && assessed > 0 ? Math.round((total / max) * 100) : null,
    records,
    rules,
  };
}
