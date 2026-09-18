import { describe, expect, it } from "vitest";
import { applyAction, publicView, ranking } from "../src/lib/engine";
import { emptyState, type Viewer } from "../src/lib/types";

const now = new Date("2026-09-16T06:00:00Z");
const admin: Viewer = { id: "coach", name: "Pelatih", role: "admin" };
const member: Viewer = { id: "one", name: "Anggota satu", role: "member" };
function fixture() {
  const state = emptyState();
  state.timezone = "Asia/Jakarta";
  state.members = ["one", "two"].map((id) => ({
    id,
    nis: id,
    name: id,
    class_name: "X",
    email: `${id}@example.test`,
    active: true,
    joined_on: "2026-01-01",
    left_on: null,
  }));
  return state;
}
describe("Pengumuman dan kompetensi", () => {
  it("hanya menampilkan pengumuman terbit, dengan audit saat diarsipkan", () => {
    let state = applyAction(
      fixture(),
      admin,
      "announcement",
      {
        title: "Informasi latihan",
        body: "Bawa perlengkapan latihan.",
        status: "draft",
      },
      now,
    );
    expect(
      publicView(state, member, "2026-09").state.announcements,
    ).toHaveLength(0);
    const id = state.announcements![0].id;
    state = applyAction(
      state,
      admin,
      "announcement",
      {
        id,
        title: "Informasi latihan",
        body: "Bawa perlengkapan latihan.",
        status: "published",
        reason: "Terbitkan informasi",
      },
      now,
    );
    expect(
      publicView(state, member, "2026-09").state.announcements,
    ).toHaveLength(1);
    expect(state.announcements![0].published_at).toBe(now.toISOString());
    state = applyAction(
      state,
      admin,
      "announcement",
      {
        id,
        title: "Informasi latihan",
        body: "Bawa perlengkapan latihan.",
        status: "archived",
        reason: "Latihan sudah selesai",
      },
      now,
    );
    expect(
      publicView(state, member, "2026-09").state.announcements,
    ).toHaveLength(0);
    expect(state.audits.at(-1)?.before).toMatchObject({ status: "published" });
  });
  it("menolak mutasi anggota, input kosong, ID asing, dan perubahan tanpa alasan", () => {
    expect(() =>
      applyAction(fixture(), member, "announcement", {}, now),
    ).toThrow("Hanya pelatih");
    expect(() =>
      applyAction(fixture(), member, "competency_assessment", {}, now),
    ).toThrow("Hanya pelatih");
    expect(() =>
      applyAction(
        fixture(),
        admin,
        "announcement",
        { title: "   ", body: "   ", status: "published" },
        now,
      ),
    ).toThrow();
    expect(() =>
      applyAction(
        fixture(),
        admin,
        "competency",
        { id: "foreign", title: "PBB", description: "", active: true },
        now,
      ),
    ).toThrow("tidak ditemukan");
    const state = applyAction(
      fixture(),
      admin,
      "competency",
      { title: "PBB", description: "", active: true },
      now,
    );
    expect(() =>
      applyAction(
        state,
        admin,
        "competency",
        { ...state.competencies![0], title: "PBB lanjutan" },
        now,
      ),
    ).toThrow();
  });
  it("penilaian hanya milik sendiri, satu per pasangan, tanpa mengubah ranking", () => {
    let state = applyAction(
      fixture(),
      admin,
      "competency",
      { title: "PBB", description: "Gerakan dasar", active: true },
      now,
    );
    const competency_id = state.competencies![0].id;
    const ranks = ranking(state, "2026-09");
    for (const member_id of ["one", "two"])
      state = applyAction(
        state,
        admin,
        "competency_assessment",
        {
          member_id,
          competency_id,
          level: "berkembang",
          note: `Catatan privat ${member_id}`,
          assessed_on: "2026-09-15",
        },
        now,
      );
    expect(
      publicView(state, member, "2026-09").state.competency_assessments,
    ).toHaveLength(1);
    expect(
      publicView(state, member, "2026-09").state.competency_assessments![0]
        .note,
    ).toBe("Catatan privat one");
    state = applyAction(
      state,
      admin,
      "competency_assessment",
      {
        member_id: "one",
        competency_id,
        level: "menguasai",
        note: "Sudah konsisten",
        assessed_on: "2026-09-16",
        reason: "Evaluasi lanjutan",
      },
      now,
    );
    expect(state.competency_assessments).toHaveLength(2);
    expect(ranking(state, "2026-09")).toEqual(ranks);
    expect(state.audits.at(-1)?.before).toMatchObject({ level: "berkembang" });
  });
  it("kompatibel dengan data lama dan menolak kompetensi nonaktif serta tanggal mendatang", () => {
    const old = fixture();
    delete old.competencies;
    delete old.competency_assessments;
    delete old.announcements;
    expect(publicView(old, member, "2026-09").state.competencies).toEqual([]);
    let state = applyAction(
      old,
      admin,
      "competency",
      { title: "PBB", description: "", active: true },
      now,
    );
    const c = state.competencies![0];
    expect(() =>
      applyAction(
        state,
        admin,
        "competency",
        { title: "pbb", description: "", active: true },
        now,
      ),
    ).toThrow("sudah digunakan");
    const input = {
      member_id: "one",
      competency_id: c.id,
      level: "berkembang",
      note: "",
      assessed_on: "2026-09-17",
    };
    expect(() =>
      applyAction(state, admin, "competency_assessment", input, now),
    ).toThrow("masa depan");
    state = applyAction(
      state,
      admin,
      "competency",
      { ...c, active: false, reason: "Tidak digunakan lagi" },
      now,
    );
    expect(() =>
      applyAction(
        state,
        admin,
        "competency_assessment",
        { ...input, assessed_on: "2026-09-15" },
        now,
      ),
    ).toThrow("kompetensi aktif");
    expect(publicView(state, member, "2026-09").state.competencies).toEqual([]);
  });
});
