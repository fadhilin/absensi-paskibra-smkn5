import { z } from "zod";
import type { State } from "./types";

export const learningActions = [
  "announcement",
  "competency",
  "competency_assessment",
];
const reasonSchema = z
  .string()
  .trim()
  .min(5, "Alasan perubahan minimal 5 karakter.")
  .max(1000);

export function applyLearningAction(
  s: State,
  action: string,
  input: Record<string, unknown>,
  now: Date,
) {
  if (action === "announcement") {
    const value = z
      .object({
        id: z.string().optional(),
        title: z.string().trim().min(3).max(160),
        body: z.string().trim().min(5).max(5000),
        status: z.enum(["draft", "published", "archived"]),
      })
      .parse(input);
    s.announcements ??= [];
    const current = s.announcements.find((a) => a.id === value.id);
    if (value.id && !current) throw new Error("Pengumuman tidak ditemukan.");
    if (current) reasonSchema.parse(input.reason);
    const before = current ? structuredClone(current) : null;
    const after = {
      ...value,
      id: current?.id ?? crypto.randomUUID(),
      updated_at: now.toISOString(),
      published_at:
        value.status === "published"
          ? current?.status === "published"
            ? current.published_at
            : now.toISOString()
          : (current?.published_at ?? null),
    };
    s.announcements = [
      ...s.announcements.filter((a) => a.id !== after.id),
      after,
    ];
    return { before, after };
  }
  if (action === "competency") {
    const value = z
      .object({
        id: z.string().optional(),
        title: z.string().trim().min(2).max(120),
        description: z.string().trim().max(1000),
        active: z.boolean(),
      })
      .parse(input);
    s.competencies ??= [];
    const current = s.competencies.find((c) => c.id === value.id);
    if (value.id && !current) throw new Error("Kompetensi tidak ditemukan.");
    if (current) reasonSchema.parse(input.reason);
    if (
      s.competencies.some(
        (c) =>
          c.id !== value.id &&
          c.title.toLocaleLowerCase("id") ===
            value.title.toLocaleLowerCase("id"),
      )
    )
      throw new Error("Nama kompetensi sudah digunakan.");
    const before = current ? structuredClone(current) : null;
    const after = { ...value, id: current?.id ?? crypto.randomUUID() };
    s.competencies = [
      ...s.competencies.filter((c) => c.id !== after.id),
      after,
    ];
    return { before, after };
  }
  const value = z
    .object({
      member_id: z.string(),
      competency_id: z.string(),
      level: z.enum(["perlu_latihan", "berkembang", "menguasai"]),
      note: z.string().trim().max(1000),
      assessed_on: z.iso.date(),
    })
    .parse(input);
  if (!s.members.some((m) => m.id === value.member_id && m.active))
    throw new Error("Pilih anggota aktif.");
  if (!s.competencies?.some((c) => c.id === value.competency_id && c.active))
    throw new Error("Pilih kompetensi aktif.");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: s.timezone || "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  if (value.assessed_on > today)
    throw new Error("Tanggal penilaian tidak boleh di masa depan.");
  s.competency_assessments ??= [];
  const current = s.competency_assessments.find(
    (a) =>
      a.member_id === value.member_id &&
      a.competency_id === value.competency_id,
  );
  if (current) reasonSchema.parse(input.reason);
  const before = current ? structuredClone(current) : null;
  const after = {
    ...value,
    id: current?.id ?? crypto.randomUUID(),
    updated_at: now.toISOString(),
  };
  s.competency_assessments = [
    ...s.competency_assessments.filter((a) => a.id !== after.id),
    after,
  ];
  return { before, after };
}
