import { z } from "zod";
import type { Attendance, State, Viewer } from "./types";
import { assertOpen, eligible } from "./engine";
import { validateAttendance } from "./domain";

export const qrClaimsSchema = z.object({
  purpose: z.literal("attendance-qr-v1"),
  session: z.string().min(1).max(100),
  version: z.number().int().positive(),
  expires: z.number().int().positive(),
});
export type QrClaims = z.infer<typeof qrClaimsSchema>;
export function qrSession(
  state: State,
  viewer: Viewer,
  sessionId: string,
  now = new Date(),
) {
  if (viewer.role !== "admin")
    throw new Error("Hanya pelatih dapat membuat QR latihan.");
  const session = state.sessions.find((s) => s.id === sessionId);
  if (
    !session ||
    session.status !== "draf" ||
    Date.parse(session.closes_at) < now.getTime()
  )
    throw new Error(
      "QR hanya tersedia untuk latihan yang belum ditutup atau dibatalkan.",
    );
  assertOpen(state, session.date.slice(0, 7));
  return session;
}
export function recordQrAttendance(
  original: State,
  viewer: Viewer,
  input: QrClaims,
  receivedAt = new Date(),
): State {
  if (viewer.role !== "member")
    throw new Error("Absensi QR hanya untuk anggota.");
  const claims = qrClaimsSchema.parse(input);
  const state = structuredClone(original);
  const session = state.sessions.find((s) => s.id === claims.session);
  const member = state.members.find((m) => m.id === viewer.id);
  if (!session || session.status === "dibatalkan")
    throw new Error("Latihan tidak tersedia atau sudah dibatalkan.");
  if (!member?.active || !eligible(member, session.date))
    throw new Error("Keanggotaan tidak aktif pada latihan ini.");
  if (session.version !== claims.version)
    throw new Error(
      "QR sudah tidak berlaku karena latihan diubah. Minta QR terbaru dari pelatih.",
    );
  if (claims.expires < receivedAt.getTime())
    throw new Error("QR sudah kedaluwarsa.");
  assertOpen(state, session.date.slice(0, 7));
  if (!state.rules.some((r) => r.month === session.date.slice(0, 7)))
    throw new Error("Pelatih belum menetapkan aturan poin.");
  const status = validateAttendance({
    receivedAt: receivedAt.getTime(),
    opensAt: Date.parse(session.opens_at),
    onTimeUntil: Date.parse(session.on_time_until),
    closesAt: Date.parse(session.closes_at),
  });
  const previous = state.attendance.find(
    (a) => a.member_id === member.id && a.session_id === session.id,
  );
  // Pengiriman ulang mengembalikan catatan pertama, termasuk jam aslinya.
  if (previous?.qr_checkin) return state;
  if (
    previous &&
    !(
      previous.automatic_absence &&
      previous.status === "alpa" &&
      !previous.evidence
    )
  )
    throw new Error(
      "Absensi sudah tercatat. Hubungi pelatih jika perlu koreksi.",
    );
  const record: Attendance = {
    id: previous?.id ?? crypto.randomUUID(),
    member_id: member.id,
    session_id: session.id,
    status,
    activity: null,
    skill: null,
    note: "",
    qr_checkin: {
      received_at: receivedAt.toISOString(),
      session_version: session.version,
    },
  };
  state.attendance = state.attendance.filter((a) => a.id !== previous?.id);
  state.attendance.push(record);
  state.audits.push({
    id: crypto.randomUUID(),
    at: receivedAt.toISOString(),
    actor: member.id,
    action: "Scan QR absensi",
    reason: "Pemindaian QR latihan",
    before: previous ?? null,
    after: record,
  });
  return state;
}
