import { describe, expect, it } from "vitest";
import { trainerAttendance } from "../src/lib/trainer-attendance";
import { emptyState, type State } from "../src/lib/types";

function fixture(): State {
  const state = emptyState();
  state.timezone = "Asia/Jakarta";
  state.members = Array.from({ length: 8 }, (_, i) => ({
    id: `m${i}`, name: `Anggota ${i}`, nis: `${i}`, email: `${i}@example.test`,
    class_name: "X", active: i !== 7, joined_on: i === 6 ? "2026-09-19" : "2026-01-01",
    left_on: i === 7 ? "2026-09-01" : null,
  }));
  state.sessions = [{
    id: "today", title: "Latihan pagi", date: "2026-09-18", location: "Sekolah", material: "PBB",
    opens_at: "2026-09-18T08:00:00+07:00", on_time_until: "2026-09-18T08:30:00+07:00",
    closes_at: "2026-09-18T10:00:00+07:00", status: "draf", version: 1,
  }];
  state.attendance = (["hadir", "terlambat", "izin", "sakit", "alpa"] as const).map((status, i) => ({
    id: `a${i}`, member_id: `m${i}`, session_id: "today", status,
    activity: null, skill: null, note: "",
  }));
  return state;
}

describe("ringkasan absensi pelatih", () => {
  it("menghitung semua anggota aktif dan hanya peserta sesi untuk absensi", () => {
    expect(trainerAttendance(fixture(), "", new Date("2026-09-18T02:00:00Z"))).toMatchObject({
      activeMembers: 7, present: 2, excused: 2, absent: 2, closed: false, started: true,
    });
  });
  it("mengubah sisa peserta menjadi alpa setelah waktu tutup, termasuk catatan kosong", () => {
    expect(trainerAttendance(fixture(), "", new Date("2026-09-18T04:00:00Z"))).toMatchObject({
      absent: 2, closed: true,
    });
  });
  it("memilih sesi berjalan dan memungkinkan memilih sesi lain tanpa mencampur hitungan", () => {
    const state = fixture();
    state.sessions.push({ ...state.sessions[0], id: "later", opens_at: "2026-09-18T12:00:00+07:00", closes_at: "2026-09-18T14:00:00+07:00" });
    const now = new Date("2026-09-18T02:00:00Z");
    expect(trainerAttendance(state, "", now).session?.id).toBe("today");
    expect(trainerAttendance(state, "later", now)).toMatchObject({ present: 0, excused: 0, absent: 6, started: false });
    state.sessions[0].status = "dibatalkan";
    expect(trainerAttendance(state, "today", now).session?.id).toBe("later");
  });
  it("menggunakan tanggal sekolah dan tidak memilih latihan hari lain", () => {
    const state = fixture();
    const summary = trainerAttendance(state, "", new Date("2026-09-17T18:00:00Z"));
    expect(summary.today).toBe("2026-09-18");
    expect(summary.session?.id).toBe("today");
    expect(trainerAttendance(state, "", new Date("2026-09-19T04:00:00Z"))).toMatchObject({
      sessions: [], session: undefined, activeMembers: 7,
    });
  });
});
