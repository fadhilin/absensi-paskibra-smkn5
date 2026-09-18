import { z } from "zod";
import { pointRulesSchema, rankMembers, sessionSchema } from "./domain";
import { Attendance, State, Ranking, Viewer, Member } from "./types";
import { applyLearningAction, learningActions } from "./learning-actions";
import {
  attendanceTotal,
  criteriaSchema,
  evaluation,
  parseScores,
} from "./scoring";

export function schoolDate(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function eligible(m: Member, date: string) {
  return (m.membership_spans ?? [{ from: m.joined_on, until: m.left_on }]).some(
    (span) => span.from <= date && (!span.until || span.until >= date),
  );
}
export function isCertified(s: State, month: string) {
  const versions = s.results.filter((r) => r.month === month);
  return versions.length > 0 && !versions.at(-1)!.reopened_at;
}
export function assertOpen(s: State, month: string) {
  if (isCertified(s, month))
    throw new Error("Buka kembali bulan disahkan sebelum mengubah data.");
}
export function ranking(s: State, month: string): Ranking[] {
  const sessions = s.sessions.filter(
    (t) => t.date.startsWith(month) && t.status !== "dibatalkan",
  );
  const rules = s.rules.find((r) => r.month === month);
  return rankMembers(
    s.members
      .filter((m) =>
        (m.membership_spans ?? [{ from: m.joined_on, until: m.left_on }]).some(
          (span) =>
            span.from.slice(0, 7) <= month &&
            (!span.until || span.until.slice(0, 7) >= month),
        ),
      )
      .map((m) => {
        const row = {
          id: m.id,
          name: m.name,
          class_name: m.class_name,
          total: 0,
          attendance: 0,
          activity: 0,
          skill: 0,
          evaluation: 0,
          incomplete: 0,
          hadir: 0,
          terlambat: 0,
          izin: 0,
          sakit: 0,
          alpa: 0,
        };
        for (const t of sessions.filter((t) => eligible(m, t.date))) {
          const a = s.attendance.find(
            (a) => a.session_id === t.id && a.member_id === m.id,
          );
          if (!a) {
            row.incomplete++;
            continue;
          }
          row[a.status]++;
          if (a.status === "hadir" || a.status === "terlambat") {
            if (!rules) {
              row.incomplete++;
              continue;
            }
            const points = attendanceTotal(a, rules);
            row.attendance += a.status === "hadir" ? rules.present : rules.late;
            row.activity += rules.criteria?.length ? 0 : (a.activity ?? 0);
            row.skill += rules.criteria?.length ? 0 : (a.skill ?? 0);
            row.evaluation += evaluation(a, rules).total;
            row.total += points.total;
            if (!points.complete) row.incomplete++;
          }
        }
        return row;
      }),
  );
}
export function closeExpired(s: State, now: Date) {
  for (const t of s.sessions) {
    if (
      t.status === "dibatalkan" ||
      new Date(t.closes_at) >= now ||
      isCertified(s, t.date.slice(0, 7))
    )
      continue;
    const wasDraft = t.status === "draf";
    t.status = "selesai";
    for (const m of s.members.filter((m) => eligible(m, t.date))) {
      if (
        !s.attendance.some((a) => a.member_id === m.id && a.session_id === t.id)
      )
        s.attendance.push({
          id: crypto.randomUUID(),
          member_id: m.id,
          session_id: t.id,
          status: "alpa",
          activity: null,
          skill: null,
          note: "Otomatis setelah sesi ditutup.",
          automatic_absence: true,
        });
    }
    if (wasDraft)
      audit(
        s,
        "system",
        "Tutup sesi otomatis",
        "Waktu sesi berakhir.",
        null,
        { session_id: t.id },
        now,
      );
  }
}
function audit(
  s: State,
  actor: string,
  action: string,
  reason: string,
  before: unknown,
  after: unknown,
  now: Date,
) {
  s.audits.push({
    id: crypto.randomUUID(),
    at: now.toISOString(),
    actor,
    action,
    reason,
    before: structuredClone(before),
    after: structuredClone(after),
  });
}
const reasonSchema = z
  .string()
  .trim()
  .min(5, "Alasan minimal 5 karakter.")
  .max(1000);

export function applyAction(
  original: State,
  actor: Viewer,
  action: string,
  input: unknown,
  now = new Date(),
): State {
  if (actor.role !== "admin")
    throw new Error("Hanya pelatih dapat melakukan tindakan ini.");
  const s = structuredClone(original);
  closeExpired(s, now);
  const d = z.record(z.string(), z.unknown()).parse(input);
  let before: unknown = null,
    after: unknown = d;
  const reason = typeof d.reason === "string" ? d.reason : "";
  if (learningActions.includes(action)) {
    ({ before, after } = applyLearningAction(s, action, d, now));
  } else if (action === "settings") {
    const value = z
      .object({
        school: z.string().trim().min(2).max(120),
        timezone: z.enum(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]),
      })
      .parse(d);
    if (s.sessions.length && value.timezone !== s.timezone)
      throw new Error("Zona waktu tidak dapat diubah setelah latihan dibuat.");
    s.school = value.school;
    s.timezone = value.timezone;
  } else if (action === "scoring_criteria") {
    const month = z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .parse(d.month);
    assertOpen(s, month);
    const r = s.rules.find((r) => r.month === month);
    if (!r)
      throw new Error(
        "Tetapkan poin absensi periode ini terlebih dahulu di Pengaturan.",
      );
    const criteria = criteriaSchema.parse(d.criteria);
    const records = s.attendance.filter((a) =>
      s.sessions.some((t) => t.id === a.session_id && t.date.startsWith(month)),
    );
    if (
      !r.criteria?.length &&
      records.some((a) => a.activity !== null || a.skill !== null)
    )
      throw new Error(
        "Periode ini sudah memiliki nilai skala lama. Gunakan skala 0–100 pada periode baru agar riwayat tidak berubah.",
      );
    if (r.criteria?.length) {
      reasonSchema.parse(reason);
      if (
        r.criteria.some(
          (c) =>
            !criteria.some((next) => next.id === c.id) &&
            records.some((a) => a.scores?.[c.id] != null),
        )
      )
        throw new Error("Kriteria yang sudah dinilai tidak dapat dihapus.");
    }
    before = structuredClone(r);
    r.criteria = criteria;
    after = r;
  } else if (action === "rules") {
    const r = pointRulesSchema.parse(d);
    assertOpen(s, r.month);
    const current = schoolDate(now, s.timezone).slice(0, 7);
    if (r.month < current)
      throw new Error("Aturan historis tidak dapat diubah.");
    if (
      s.attendance.some((a) =>
        s.sessions.some(
          (t) =>
            t.id === a.session_id &&
            t.date.startsWith(r.month) &&
            (a.evidence ||
              a.qr_checkin ||
              Object.values(a.scores ?? {}).some((score) => score !== null) ||
              a.activity !== null ||
              a.skill !== null ||
              a.status === "hadir" ||
              a.status === "terlambat"),
        ),
      )
    )
      throw new Error("Aturan sudah digunakan. Atur untuk bulan berikutnya.");
    before = s.rules.find((x) => x.month === r.month) ?? null;
    s.rules = [...s.rules.filter((x) => x.month !== r.month), r];
    after = r;
  } else if (action === "session") {
    if (!s.timezone)
      throw new Error("Tetapkan zona waktu sekolah terlebih dahulu.");
    const value = sessionSchema.parse(d);
    const month = value.date.slice(0, 7);
    assertOpen(s, month);
    if (!s.rules.some((r) => r.month === month))
      throw new Error("Tetapkan aturan poin bulan latihan terlebih dahulu.");
    if (
      [value.opens_at, value.on_time_until, value.closes_at].some(
        (v) => schoolDate(new Date(v), s.timezone) !== value.date,
      )
    )
      throw new Error(
        "Seluruh waktu absensi harus berada pada tanggal latihan dalam zona sekolah.",
      );
    const existing = s.sessions.find((t) => t.id === d.id);
    if (existing) {
      assertOpen(s, existing.date.slice(0, 7));
      reasonSchema.parse(reason);
      before = structuredClone(existing);
      if (existing.date !== value.date)
        throw new Error(
          "Tanggal latihan yang sudah dibuat tidak dapat diubah.",
        );
      if (existing.status !== "draf")
        throw new Error("Hanya sesi draf dapat diubah.");
      Object.assign(existing, value, { version: existing.version + 1 });
      after = existing;
    } else {
      if (new Date(value.closes_at) <= now)
        throw new Error("Jam tutup latihan baru harus berada di masa depan.");
      s.sessions.push({
        ...value,
        id: crypto.randomUUID(),
        version: 1,
        status: "draf",
      });
    }
  } else if (action === "cancel-session") {
    reasonSchema.parse(reason);
    const t = s.sessions.find((t) => t.id === d.id);
    if (!t) throw new Error("Latihan tidak ditemukan.");
    assertOpen(s, t.date.slice(0, 7));
    before = structuredClone(t);
    t.status = "dibatalkan";
    t.version++;
    after = t;
  } else if (action === "member-update") {
    const value = z
      .object({
        id: z.string(),
        name: z.string().trim().min(2),
        class_name: z.string().trim().min(1),
        active: z.boolean(),
      })
      .parse(d);
    const m = s.members.find((m) => m.id === value.id);
    if (!m) throw new Error("Anggota tidak ditemukan.");
    reasonSchema.parse(reason);
    before = structuredClone(m);
    if (m.active !== value.active) {
      m.membership_spans ??= [{ from: m.joined_on, until: m.left_on }];
      const today = schoolDate(now, s.timezone);
      if (value.active) m.membership_spans.push({ from: today, until: null });
      else {
        const current = m.membership_spans.find((span) => span.until === null);
        if (current) current.until = today;
      }
      m.left_on = value.active ? null : today;
    }
    Object.assign(m, value);
    after = m;
  } else if (action === "grade" || action === "attendance-correction") {
    const t = s.sessions.find((t) => t.id === d.session_id);
    const m = s.members.find((m) => m.id === d.member_id);
    if (!t || !m || !eligible(m, t.date))
      throw new Error("Peserta atau latihan tidak valid.");
    assertOpen(s, t.date.slice(0, 7));
    if (t.status === "dibatalkan") throw new Error("Latihan sudah dibatalkan.");
    let a = s.attendance.find(
      (a) => a.session_id === t.id && a.member_id === m.id,
    );
    before = a ? structuredClone(a) : null;
    if (action === "grade") {
      if (!a || !["hadir", "terlambat"].includes(a.status))
        throw new Error("Penilaian hanya untuk hadir atau terlambat.");
      const r = s.rules.find((r) => r.month === t.date.slice(0, 7));
      if (!r) throw new Error("Aturan poin belum ditetapkan.");
      if (r.criteria?.length) {
        const scores = parseScores(d.scores, r);
        const note = z.string().max(1000).parse(d.note);
        if (Object.values(a.scores ?? {}).some((score) => score !== null))
          reasonSchema.parse(reason);
        a.scores = scores;
        a.note = note;
      } else {
        const grade = z
          .object({
            activity: z.number().int().min(0).max(r.activity).nullable(),
            skill: z.number().int().min(0).max(r.skill).nullable(),
            note: z.string().max(1000),
          })
          .parse(d);
        if (a.activity !== null || a.skill !== null) reasonSchema.parse(reason);
        Object.assign(a, grade);
      }
    } else {
      reasonSchema.parse(reason);
      const status = z
        .enum(["hadir", "terlambat", "izin", "sakit", "alpa"])
        .parse(d.status);
      if (
        ["hadir", "terlambat"].includes(status) &&
        !a?.evidence &&
        !a?.qr_checkin
      )
        throw new Error(
          "Kehadiran wajib memiliki catatan scan QR atau bukti absensi lama yang valid.",
        );
      if (!a) {
        a = {
          id: crypto.randomUUID(),
          member_id: m.id,
          session_id: t.id,
          status,
          activity: null,
          skill: null,
          note: reason,
        };
        s.attendance.push(a);
      }
      a.status = status;
      a.automatic_absence = false;
      a.note = reason;
    }
    after = a;
  } else if (action === "certify") {
    const month = z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .parse(d.month);
    assertOpen(s, month);
    if (month >= schoolDate(now, s.timezone).slice(0, 7))
      throw new Error("Bulan belum berakhir.");
    const rows = ranking(s, month);
    if (rows.some((r) => r.incomplete > 0))
      throw new Error(
        "Lengkapi seluruh absensi dan penilaian sebelum pengesahan.",
      );
    const winners = rows
      .filter((r) => r.rank === 1 && r.total > 0)
      .map((r) => r.id);
    if (!winners.length) reasonSchema.parse(reason);
    const result = {
      month,
      version: s.results.filter((r) => r.month === month).length + 1,
      certified_at: now.toISOString(),
      certified_by: actor.id,
      winners,
      rows,
      note: reason,
    };
    s.results.push(result);
    after = result;
  } else if (action === "reopen") {
    reasonSchema.parse(reason);
    const result = s.results.filter((r) => r.month === d.month).at(-1);
    if (!result || result.reopened_at) throw new Error("Bulan belum disahkan.");
    before = structuredClone(result);
    result.reopened_at = now.toISOString();
    after = result;
  } else if (action === "achievement") {
    const value = z
      .object({
        member_id: z.string(),
        title: z.string().min(2).max(160),
        date: z.iso.date(),
        note: z.string().max(1000),
      })
      .parse(d);
    if (!s.members.some((m) => m.id === value.member_id))
      throw new Error("Anggota tidak ditemukan.");
    s.achievements.push({ ...value, id: crypto.randomUUID() });
  } else throw new Error("Tindakan tidak dikenal.");
  audit(s, actor.id, action, reason, before, after, now);
  return s;
}

export function publicView(s: State, viewer: Viewer, month: string) {
  const rows = ranking(s, month);
  const allTime = [
    ...new Set(s.sessions.map((t) => t.date.slice(0, 7))),
  ].reduce(
    (sum, p) =>
      sum + (ranking(s, p).find((r) => r.id === viewer.id)?.total ?? 0),
    0,
  );
  if (viewer.role === "admin") return { state: s, ranking: rows, allTime };
  const own = s.members.find((m) => m.id === viewer.id);
  return {
    state: {
      ...s,
      trainers: undefined,
      announcements: (s.announcements ?? []).filter(
        (a) => a.status === "published",
      ),
      competencies: (s.competencies ?? []).filter((c) => c.active),
      competency_assessments: (s.competency_assessments ?? []).filter(
        (a) =>
          a.member_id === viewer.id &&
          s.competencies?.some((c) => c.id === a.competency_id && c.active),
      ),
      members: own ? [own] : [],
      attendance: s.attendance.filter((a) => a.member_id === viewer.id),
      audits: [],
      achievements: s.achievements.filter((a) => a.member_id === viewer.id),
      results: s.results
        .filter((r) => !r.reopened_at)
        .map((r) => ({
          ...r,
          rows: r.rows.map((row) => ({
            id: row.id,
            name: row.name,
            class_name: row.class_name,
            total: row.total,
            rank: row.rank,
          })),
          certified_by: "",
        })),
    },
    ranking: rows.map((r) => ({
      id: r.id,
      name: r.name,
      class_name: r.class_name,
      total: r.total,
      rank: r.rank,
    })),
    allTime,
  };
}
