import { z } from "zod";
import { criteriaSchema } from "./scoring";

export const pointRulesSchema = z
  .object({
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    present: z.number().int().nonnegative(),
    late: z.number().int().nonnegative(),
    activity: z.number().int().nonnegative(),
    skill: z.number().int().nonnegative(),
    criteria: criteriaSchema.optional(),
  })
  .refine(
    (r) => r.late <= r.present,
    "Poin terlambat tidak boleh melebihi poin hadir.",
  )
  .refine(
    (r) =>
      !!r.criteria?.length || (r.present > r.activity && r.present > r.skill),
    "Poin hadir harus lebih besar dari maksimum setiap komponen.",
  );

export function validateAttendance(input: {
  receivedAt: number;
  opensAt: number;
  onTimeUntil: number;
  closesAt: number;
}): "hadir" | "terlambat" {
  if (input.opensAt > input.onTimeUntil || input.onTimeUntil > input.closesAt)
    throw new Error("Urutan waktu sesi tidak valid.");
  if (input.receivedAt < input.opensAt || input.receivedAt > input.closesAt)
    throw new Error("Absensi berada di luar waktu sesi.");
  return input.receivedAt <= input.onTimeUntil ? "hadir" : "terlambat";
}

export function trainingPoints(
  status: string,
  activity: number | null,
  skill: number | null,
  rules: { present: number; late: number },
) {
  if (status !== "hadir" && status !== "terlambat")
    return { total: 0, complete: true };
  return {
    total:
      (status === "hadir" ? rules.present : rules.late) +
      (activity ?? 0) +
      (skill ?? 0),
    complete: activity !== null && skill !== null,
  };
}

export function rankMembers<T extends { total: number }>(rows: T[]) {
  let last = -1,
    rank = 0;
  return [...rows]
    .sort((a, b) => b.total - a.total)
    .map((row, i) => {
      if (row.total !== last) rank = i + 1;
      last = row.total;
      return { ...row, rank };
    });
}

export const memberSchema = z.object({
  nis: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(120),
  class_name: z.string().trim().min(1).max(60),
  email: z.email(),
  joined_on: z.iso.date(),
  password: z.string().min(10).max(128),
});

export const sessionSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    material: z.string().max(1000),
    date: z.iso.date(),
    location: z.string().trim().min(2).max(160),
    opens_at: z.iso.datetime({ offset: true }),
    on_time_until: z.iso.datetime({ offset: true }),
    closes_at: z.iso.datetime({ offset: true }),
  })
  .refine(
    (s) =>
      Date.parse(s.opens_at) <= Date.parse(s.on_time_until) &&
      Date.parse(s.on_time_until) <= Date.parse(s.closes_at),
    "Urutan waktu harus buka ≤ tepat waktu ≤ tutup.",
  );
