import { describe, expect, it } from "vitest";
import { applyAction, publicView, ranking } from "../src/lib/engine";
import { emptyState, type State, type Viewer } from "../src/lib/types";
import { evaluationSummary } from "../src/lib/scoring";
const admin: Viewer = { id: "coach", name: "Coach", role: "admin" };
const now = new Date("2026-02-01T00:00:00Z");
function fixture(): State {
  const s = emptyState();
  s.timezone = "Asia/Jakarta";
  s.members = ["one", "two"].map((id) => ({
    id,
    nis: id,
    name: id,
    class_name: "X",
    email: `${id}@example.test`,
    active: true,
    joined_on: "2026-01-01",
    left_on: null,
  }));
  s.rules = [
    {
      month: "2026-01",
      present: 10,
      late: 7,
      activity: 0,
      skill: 0,
      criteria: [
        { id: "pbb", name: "PBB" },
        { id: "fisik", name: "Fisik" },
        { id: "disiplin", name: "Disiplin" },
      ],
    },
  ];
  s.sessions = [
    {
      id: "s1",
      date: "2026-01-15",
      title: "Latihan",
      material: "PBB",
      location: "Sekolah",
      latitude: 0,
      longitude: 0,
      radius: 100,
      opens_at: "2026-01-15T00:00:00Z",
      on_time_until: "2026-01-15T01:00:00Z",
      closes_at: "2026-01-15T02:00:00Z",
      status: "selesai",
      version: 1,
    },
  ];
  s.attendance = s.members.map((m) => ({
    id: m.id,
    member_id: m.id,
    session_id: "s1",
    status: "hadir",
    activity: null,
    skill: null,
    note: "",
    scores: { pbb: 80, fisik: 90, disiplin: 70 },
  }));
  return s;
}
describe("Akumulasi nilai 0–100", () => {
  it("menghitung 240/300 sebagai 80%, dan menambahkan poin absensi untuk ranking", () => {
    const s = fixture();
    expect(evaluationSummary(s, "one", "2026-01")).toMatchObject({
      total: 240,
      max: 300,
      percentage: 80,
      missing: 0,
    });
    expect(
      ranking(s, "2026-01").map((r) => ({ total: r.total, rank: r.rank })),
    ).toEqual([
      { total: 250, rank: 1 },
      { total: 250, rank: 1 },
    ]);
    const updated = applyAction(
      s,
      admin,
      "grade",
      {
        member_id: "two",
        session_id: "s1",
        scores: { pbb: 100, fisik: 100, disiplin: 100 },
        note: "",
        reason: "Periksa ulang nilai",
      },
      now,
    );
    expect(ranking(updated, "2026-01").map((r) => r.id)).toEqual([
      "two",
      "one",
    ]);
    expect(ranking(updated, "2026-01")[0].total).toBe(310);
  });
  it("menolak nilai -1, 101, pecahan dan kriteria asing; menerima 0 serta 100", () => {
    for (const pbb of [-1, 101, 80.5])
      expect(() =>
        applyAction(
          fixture(),
          admin,
          "grade",
          {
            member_id: "one",
            session_id: "s1",
            scores: { pbb },
            note: "",
            reason: "Uji rentang nilai",
          },
          now,
        ),
      ).toThrow();
    expect(() =>
      applyAction(
        fixture(),
        admin,
        "grade",
        {
          member_id: "one",
          session_id: "s1",
          scores: { asing: 80 },
          note: "",
          reason: "Uji validasi",
        },
        now,
      ),
    ).toThrow("tidak dikenal");
    const updated = applyAction(
      fixture(),
      admin,
      "grade",
      {
        member_id: "one",
        session_id: "s1",
        scores: { pbb: 0, fisik: 100, disiplin: null },
        note: "",
        reason: "Uji rentang nilai",
      },
      now,
    );
    expect(updated.attendance[0].scores).toEqual({
      pbb: 0,
      fisik: 100,
      disiplin: null,
    });
  });
  it("nilai nol lengkap menjadi 0%, berbeda dari belum dinilai", () => {
    const s = fixture();
    s.attendance[0].scores = { pbb: 0, fisik: 0, disiplin: 0 };
    expect(evaluationSummary(s, "one", "2026-01")).toMatchObject({
      total: 0,
      max: 300,
      percentage: 0,
      missing: 0,
      assessed: 3,
    });
    expect(ranking(s, "2026-01").find((r) => r.id === "one")).toMatchObject({
      total: 10,
      incomplete: 0,
    });
  });
  it("nilai kosong menjadi sementara dan menghalangi pengesahan", () => {
    const s = fixture();
    s.attendance[0].scores!.disiplin = null;
    expect(evaluationSummary(s, "one", "2026-01")).toMatchObject({
      total: 170,
      max: 300,
      percentage: 57,
      missing: 1,
    });
    expect(() =>
      applyAction(s, admin, "certify", { month: "2026-01", reason: "" }, now),
    ).toThrow("Lengkapi");
    s.attendance[0].scores = {};
    expect(evaluationSummary(s, "one", "2026-01").percentage).toBeNull();
  });
  it("penambahan kriteria mempertahankan nilai; kriteria bernilai tidak dapat dihapus", () => {
    const s = fixture();
    const updated = applyAction(
      s,
      admin,
      "scoring_criteria",
      {
        month: "2026-01",
        criteria: [
          ...s.rules[0].criteria!,
          { id: "regu", name: "Kekompakan regu" },
        ],
        reason: "Tambah aspek penilaian",
      },
      now,
    );
    expect(ranking(updated, "2026-01")[0]).toMatchObject({
      total: 250,
      incomplete: 1,
    });
    expect(evaluationSummary(updated, "one", "2026-01")).toMatchObject({
      total: 240,
      max: 400,
      percentage: 60,
      missing: 1,
    });
    expect(() =>
      applyAction(
        updated,
        admin,
        "scoring_criteria",
        {
          month: "2026-01",
          criteria: [{ id: "pbb", name: "PBB" }],
          reason: "Hapus aspek penilaian",
        },
        now,
      ),
    ).toThrow("tidak dapat dihapus");
  });
  it("mengabaikan sesi batal/izin dan menjaga nilai anggota lain tetap privat", () => {
    const s = fixture();
    s.attendance[0].status = "izin";
    expect(evaluationSummary(s, "one", "2026-01").max).toBe(0);
    expect(ranking(s, "2026-01").find((r) => r.id === "one")!.total).toBe(0);
    const view = publicView(
      s,
      { id: "one", name: "one", role: "member" },
      "2026-01",
    );
    expect(view.state.attendance).toHaveLength(1);
    expect(view.ranking[0]).not.toHaveProperty("evaluation");
    s.sessions[0].status = "dibatalkan";
    expect(evaluationSummary(s, "two", "2026-01").max).toBe(0);
  });
});
