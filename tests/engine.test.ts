import { describe, it, expect } from "vitest";
import {
  applyAction,
  closeExpired,
  eligible,
  isCertified,
  publicView,
  ranking,
} from "../src/lib/engine";
import { emptyState, State, Viewer } from "../src/lib/types";
import { parseCSV, toCSV } from "../src/lib/csv";
const admin: Viewer = { id: "admin", name: "Pelatih", role: "admin" };
function fixture(): State {
  const s = emptyState();
  s.timezone = "Asia/Jakarta";
  s.members = [
    {
      id: "m1",
      name: "Satu",
      nis: "1",
      class_name: "X",
      email: "one@example.test",
      joined_on: "2026-01-01",
      left_on: null,
      active: true,
    },
    {
      id: "m2",
      name: "Dua",
      nis: "2",
      class_name: "X",
      email: "two@example.test",
      joined_on: "2026-01-01",
      left_on: null,
      active: true,
    },
  ];
  s.rules = [{ month: "2026-01", present: 10, late: 7, activity: 5, skill: 5 }];
  s.sessions = [
    {
      id: "s1",
      title: "Latihan Januari",
      material: "PBB",
      date: "2026-01-10",
      location: "Sekolah",
      latitude: 0,
      longitude: 0,
      radius: 100,
      opens_at: "2026-01-10T00:00:00Z",
      on_time_until: "2026-01-10T01:00:00Z",
      closes_at: "2026-01-10T02:00:00Z",
      status: "selesai",
      version: 1,
    },
  ];
  s.attendance = s.members.map((m) => ({
    id: "a" + m.id,
    member_id: m.id,
    session_id: "s1",
    status: "hadir",
    activity: 4,
    skill: 3,
    note: "private note",
    evidence: {
      path: "private.jpg",
      received_at: "2026-01-10T00:00:00Z",
      latitude: 0,
      longitude: 0,
      accuracy: 5,
      distance: 0,
      session_version: 1,
      token_id: m.id,
    },
  }));
  return s;
}
const feb = new Date("2026-02-01T01:00:00Z");
describe("Pengesahan, koreksi, dan akses", () => {
  it("menghitung berdasarkan tanggal latihan dan mempertahankan aturan historis", () => {
    const s = applyAction(
      fixture(),
      admin,
      "rules",
      { month: "2026-02", present: 20, late: 12, activity: 7, skill: 7 },
      feb,
    );
    expect(ranking(s, "2026-01")[0].total).toBe(17);
    expect(ranking(s, "2026-02")[0].total).toBe(0);
  });
  it("menolak perubahan aturan yang telah digunakan", () => {
    expect(() =>
      applyAction(
        fixture(),
        admin,
        "rules",
        { month: "2026-01", present: 20, late: 10, activity: 5, skill: 5 },
        new Date("2026-01-15"),
      ),
    ).toThrow("sudah digunakan");
  });
  it("menolak pengesahan sebelum akhir bulan dan nilai tidak lengkap", () => {
    expect(() =>
      applyAction(
        fixture(),
        admin,
        "certify",
        { month: "2026-01" },
        new Date("2026-01-15"),
      ),
    ).toThrow("belum berakhir");
    const s = fixture();
    s.attendance[0].activity = null;
    expect(() =>
      applyAction(s, admin, "certify", { month: "2026-01" }, feb),
    ).toThrow("Lengkapi");
  });
  it("menyimpan pemenang bersama dan seluruh versi pengesahan ulang", () => {
    let s = applyAction(fixture(), admin, "certify", { month: "2026-01" }, feb);
    expect(s.results[0].winners).toEqual(["m1", "m2"]);
    expect(() =>
      applyAction(
        s,
        admin,
        "grade",
        {
          session_id: "s1",
          member_id: "m1",
          activity: 5,
          skill: 5,
          note: "",
          reason: "Koreksi hasil",
        },
        feb,
      ),
    ).toThrow("Buka kembali");
    s = applyAction(
      s,
      admin,
      "reopen",
      { month: "2026-01", reason: "Peninjauan nilai" },
      feb,
    );
    s = applyAction(
      s,
      admin,
      "grade",
      {
        session_id: "s1",
        member_id: "m1",
        activity: 5,
        skill: 5,
        note: "",
        reason: "Koreksi hasil",
      },
      feb,
    );
    s = applyAction(s, admin, "certify", { month: "2026-01" }, feb);
    expect(s.results).toHaveLength(2);
    expect(s.results[0].winners).toEqual(["m1", "m2"]);
    expect(s.results[1].winners).toEqual(["m1"]);
    expect(isCertified(s, "2026-01")).toBe(true);
    expect(s.audits).toHaveLength(4);
  });
  it("menolak nilai di luar batas dan hak akses anggota", () => {
    expect(() =>
      applyAction(
        fixture(),
        admin,
        "grade",
        {
          session_id: "s1",
          member_id: "m1",
          activity: 6,
          skill: 3,
          note: "",
          reason: "Koreksi nilai",
        },
        feb,
      ),
    ).toThrow();
    expect(() =>
      applyAction(
        fixture(),
        { id: "m1", role: "member", name: "Satu" },
        "certify",
        { month: "2026-01" },
        feb,
      ),
    ).toThrow("Hanya pelatih");
  });
  it("menutup sesi dengan alpa dan tidak membuat duplikasi", () => {
    const s = fixture();
    s.sessions[0].status = "draf";
    s.attendance = [];
    closeExpired(s, feb);
    closeExpired(s, feb);
    expect(s.attendance).toHaveLength(2);
    expect(s.attendance.every((a) => a.status === "alpa")).toBe(true);
    expect(s.attendance.every((a) => a.automatic_absence === true)).toBe(true);
    expect(s.audits).toHaveLength(1);
  });
  it("tidak membuat hadir tanpa bukti, mempertahankan bukti koreksi", () => {
    const s = fixture();
    delete s.attendance[0].evidence;
    expect(() =>
      applyAction(
        s,
        admin,
        "attendance-correction",
        {
          session_id: "s1",
          member_id: "m1",
          status: "hadir",
          reason: "Koreksi absensi",
        },
        feb,
      ),
    ).toThrow("bukti");
    const before = fixture();
    const after = applyAction(
      before,
      admin,
      "attendance-correction",
      {
        session_id: "s1",
        member_id: "m1",
        status: "sakit",
        reason: "Keterangan sakit",
      },
      feb,
    );
    expect(after.attendance[0].evidence).toEqual(before.attendance[0].evidence);
    expect(ranking(after, "2026-01").find((r) => r.id === "m1")?.total).toBe(0);
  });
  it("mengabaikan latihan dibatalkan dan tidak memberi pemenang nol", () => {
    const s = fixture();
    s.sessions[0].status = "dibatalkan";
    expect(ranking(s, "2026-01")[0].total).toBe(0);
    const result = applyAction(
      s,
      admin,
      "certify",
      { month: "2026-01", reason: "Tidak ada latihan sah" },
      feb,
    );
    expect(result.results[0].winners).toEqual([]);
  });
  it("menyembunyikan absensi, email, nilai komponen, catatan, serta audit anggota lain", () => {
    let s = fixture();
    s = applyAction(s, admin, "certify", { month: "2026-01" }, feb);
    const view = publicView(
      s,
      { id: "m1", role: "member", name: "Satu" },
      "2026-01",
    );
    expect(view.state.members).toHaveLength(1);
    expect(view.state.attendance).toHaveLength(1);
    expect(view.state.audits).toEqual([]);
    expect(view.ranking[1]).not.toHaveProperty("activity");
    expect(view.state.results[0].rows[1]).not.toHaveProperty("skill");
    expect(JSON.stringify(view)).not.toContain("two@example.test");
  });
  it("mempertahankan jeda keanggotaan saat aktivasi kembali", () => {
    let s = fixture();
    s = applyAction(
      s,
      admin,
      "member-update",
      {
        id: "m1",
        name: "Satu",
        class_name: "X",
        active: false,
        reason: "Keluar sementara",
      },
      new Date("2026-01-15"),
    );
    s = applyAction(
      s,
      admin,
      "member-update",
      {
        id: "m1",
        name: "Satu",
        class_name: "X",
        active: true,
        reason: "Bergabung kembali",
      },
      new Date("2026-02-15"),
    );
    expect(eligible(s.members[0], "2026-01-10")).toBe(true);
    expect(eligible(s.members[0], "2026-02-01")).toBe(false);
    expect(eligible(s.members[0], "2026-02-16")).toBe(true);
  });
});
describe("Audit immutable", () => {
  it("pembukaan kembali tidak mengubah snapshot audit pengesahan", () => {
    let state = applyAction(
      fixture(),
      admin,
      "certify",
      { month: "2026-01" },
      feb,
    );
    const originalAudit = structuredClone(state.audits[0]);
    state = applyAction(
      state,
      admin,
      "reopen",
      { month: "2026-01", reason: "Pemeriksaan ulang hasil" },
      feb,
    );
    expect(state.audits[0]).toEqual(originalAudit);
    expect(state.results[0].reopened_at).toBeDefined();
  });
});
describe("CSV", () => {
  it("mendukung kutipan, koma, BOM dan baris baru", () => {
    const csv =
      '\uFEFFnis,name,class_name,email,joined_on,password\r\n1,"Nama, Satu",X,one@example.test,2026-01-01,password123\r\n';
    expect(parseCSV(csv)[0].name).toBe("Nama, Satu");
  });
  it("menolak kolom hilang dan kutipan terbuka", () => {
    expect(() => parseCSV("nis,name\n1,Satu")).toThrow("wajib");
    expect(() => parseCSV('"belum tutup')).toThrow("kutip");
  });
  it("melindungi hasil ekspor dari formula CSV", () => {
    expect(toCSV([["=1+1"]])).toContain("'=1+1");
  });
});
