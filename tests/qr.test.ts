import { afterEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import sharp from "sharp";
import { emptyState, type State, type Viewer } from "../src/lib/types";
import { issueQrToken, verifyQrToken } from "../src/lib/qr-token";
import {
  qrSession,
  recordQrAttendance,
  type QrClaims,
} from "../src/lib/qr-attendance";
import {
  applyAction,
  closeExpired,
  publicView,
  ranking,
} from "../src/lib/engine";
const admin: Viewer = { id: "coach", name: "Pelatih", role: "admin" };
const member: Viewer = { id: "member", name: "Anggota", role: "member" };
function fixture(): State {
  const state = emptyState();
  state.timezone = "Asia/Jakarta";
  state.members = [
    {
      id: member.id,
      nis: "123",
      name: member.name,
      class_name: "X",
      email: "member@example.test",
      active: true,
      joined_on: "2026-09-01",
      left_on: null,
    },
    {
      id: "other",
      nis: "456",
      name: "Lain",
      class_name: "XI",
      email: "other@example.test",
      active: true,
      joined_on: "2026-09-01",
      left_on: null,
    },
  ];
  state.sessions = [
    {
      id: "session",
      title: "Latihan QR",
      date: "2026-09-17",
      location: "Lapangan",
      material: "PBB",
      opens_at: "2026-09-17T01:00:00Z",
      on_time_until: "2026-09-17T01:30:00Z",
      closes_at: "2026-09-17T02:00:00Z",
      status: "draf",
      version: 1,
    },
  ];
  state.rules = [
    {
      month: "2026-09",
      present: 10,
      late: 7,
      activity: 0,
      skill: 0,
      criteria: [{ id: "pbb", name: "PBB" }],
    },
  ];
  return state;
}
const at = (value: string) => new Date(`2026-09-17T${value}Z`);
const claims: QrClaims = {
  purpose: "attendance-qr-v1",
  session: "session",
  version: 1,
  expires: at("02:00:00").getTime(),
};
afterEach(() => vi.unstubAllEnvs());
describe("Absensi QR", () => {
  it("hanya pelatih dapat membuat QR sesi aktif, termasuk sebelum buka", () => {
    expect(qrSession(fixture(), admin, "session", at("00:00:00")).id).toBe(
      "session",
    );
    expect(() =>
      qrSession(fixture(), member, "session", at("01:00:00")),
    ).toThrow("pelatih");
    expect(() =>
      qrSession(fixture(), admin, "session", at("02:00:01")),
    ).toThrow("ditutup");
    const s = fixture();
    s.sessions[0].status = "dibatalkan";
    expect(() => qrSession(s, admin, "session", at("01:00:00"))).toThrow(
      "dibatalkan",
    );
  });
  it("token bertanda tangan menolak perubahan, secret lain, token foto lama dan kedaluwarsa", () => {
    vi.stubEnv("ATTENDANCE_TOKEN_SECRET", "a".repeat(64));
    const token = issueQrToken(claims);
    expect(verifyQrToken(token, at("02:00:00").getTime())).toEqual(claims);
    expect(() =>
      verifyQrToken(token + ".extra", at("01:00:00").getTime()),
    ).toThrow();
    expect(() =>
      verifyQrToken(
        token.replace("PASKIBRA-QR:", "PASKIBRA-DEMO:"),
        at("01:00:00").getTime(),
      ),
    ).toThrow();
    expect(() => verifyQrToken(token, at("02:00:01").getTime())).toThrow(
      "kedaluwarsa",
    );
    vi.stubEnv("ATTENDANCE_TOKEN_SECRET", "b".repeat(64));
    expect(() => verifyQrToken(token, at("01:00:00").getTime())).toThrow(
      "diubah",
    );
  });
  it("menghasilkan gambar QR yang dapat dibaca kembali sebagai token asli", async () => {
    vi.stubEnv("ATTENDANCE_TOKEN_SECRET", "c".repeat(64));
    const token = issueQrToken(claims);
    const png = await QRCode.toBuffer(token, { width: 720, margin: 4 });
    const raw = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(
      jsQR(new Uint8ClampedArray(raw.data), raw.info.width, raw.info.height)
        ?.data,
    ).toBe(token);
  });
  it("menyimpan jam server, status dan audit tanpa foto atau lokasi; scan ulang idempoten", () => {
    const state = recordQrAttendance(fixture(), member, claims, at("01:30:00"));
    expect(state.attendance[0]).toMatchObject({
      member_id: member.id,
      status: "hadir",
      qr_checkin: {
        received_at: at("01:30:00").toISOString(),
        session_version: 1,
      },
    });
    expect(state.attendance[0]).not.toHaveProperty("evidence");
    expect(state.attendance[0]).not.toHaveProperty("latitude");
    expect(state.audits).toHaveLength(1);
    const repeat = recordQrAttendance(state, member, claims, at("01:40:00"));
    expect(repeat.attendance).toEqual(state.attendance);
    expect(repeat.audits).toHaveLength(1);
    expect(
      ranking(repeat, "2026-09").find((r) => r.id === member.id)?.attendance,
    ).toBe(10);
    expect(
      recordQrAttendance(fixture(), member, claims, at("01:30:01"))
        .attendance[0].status,
    ).toBe("terlambat");
  });
  it("menolak peran, anggota nonaktif, QR versi lama, waktu tutup dan sesi batal", () => {
    expect(() =>
      recordQrAttendance(fixture(), admin, claims, at("01:00:00")),
    ).toThrow("anggota");
    expect(() =>
      recordQrAttendance(fixture(), member, claims, at("00:59:59")),
    ).toThrow("waktu");
    expect(() =>
      recordQrAttendance(fixture(), member, claims, at("02:00:01")),
    ).toThrow("kedaluwarsa");
    const inactive = fixture();
    inactive.members[0].active = false;
    expect(() =>
      recordQrAttendance(inactive, member, claims, at("01:00:00")),
    ).toThrow("aktif");
    const changed = fixture();
    changed.sessions[0].version = 2;
    expect(() =>
      recordQrAttendance(changed, member, claims, at("01:00:00")),
    ).toThrow("diubah");
    changed.sessions[0].status = "dibatalkan";
    expect(() =>
      recordQrAttendance(changed, member, claims, at("01:00:00")),
    ).toThrow("dibatalkan");
  });
  it("mempertahankan izin manual, mengganti alpa otomatis pada balapan penutupan, membatasi proyeksi anggota", () => {
    const state = applyAction(
      fixture(),
      admin,
      "attendance-correction",
      {
        session_id: "session",
        member_id: member.id,
        status: "izin",
        reason: "Ada keperluan keluarga",
      },
      at("01:00:00"),
    );
    expect(() =>
      recordQrAttendance(state, member, claims, at("01:00:00")),
    ).toThrow("sudah tercatat");
    const closed = fixture();
    closeExpired(closed, at("02:00:01"));
    const committed = recordQrAttendance(
      closed,
      member,
      claims,
      at("02:00:00"),
    );
    expect(
      committed.attendance.find((a) => a.member_id === member.id)?.status,
    ).toBe("terlambat");
    const own = publicView(committed, member, "2026-09");
    expect(own.state.attendance).toHaveLength(1);
    const corrected = applyAction(
      committed,
      admin,
      "attendance-correction",
      {
        session_id: "session",
        member_id: member.id,
        status: "hadir",
        reason: "Koreksi jam kedatangan",
      },
      at("02:00:02"),
    );
    expect(
      corrected.attendance.find((a) => a.member_id === member.id)?.qr_checkin,
    ).toEqual(
      committed.attendance.find((a) => a.member_id === member.id)?.qr_checkin,
    );
  });
});
