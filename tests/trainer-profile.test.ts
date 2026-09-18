import { describe, expect, it } from "vitest";
import { emptyState, type Viewer } from "../src/lib/types";
import {
  ownPhotoProfile,
  photoReferenced,
  trainerDirectory,
  updateTrainerProfile,
} from "../src/lib/trainer-profile";
import { publicView } from "../src/lib/engine";
const coach: Viewer = { id: "coach", name: "Pelatih", role: "admin" };
const member: Viewer = { id: "member", name: "Anggota", role: "member" };
describe("Profil pelatih", () => {
  it("pemilik memperbarui nama tanpa dapat mengubah akun lain atau menyisipkan path foto", () => {
    const state = emptyState();
    state.trainers = [{ id: "other", name: "Pelatih lain" }];
    updateTrainerProfile(state, coach, {
      id: "other",
      name: "  Nama baru  ",
      photo_path: "injected",
    });
    expect(state.trainers).toEqual([
      { id: "other", name: "Pelatih lain" },
      { id: "coach", name: "Nama baru" },
    ]);
    expect(state.audits[0].actor).toBe("coach");
    expect(() =>
      updateTrainerProfile(state, member, { name: "Anggota" }),
    ).toThrow("Hanya pelatih");
    expect(() => updateTrainerProfile(state, coach, { name: " " })).toThrow();
  });
  it("direktori hanya menerbitkan nama dan metadata foto pelatih aktif tanpa path privat", () => {
    const state = emptyState();
    state.trainers = [
      {
        id: "coach",
        name: "Nama tampil",
        photo_path: "private/photo.jpg",
        photo_updated_at: "v1",
      },
      { id: "inactive", name: "Nonaktif", photo_path: "private/old.jpg" },
    ];
    const directory = trainerDirectory(state, [
      { ...coach, active: true },
      { ...member, active: true },
      { id: "inactive", name: "Nonaktif", role: "admin", active: false },
    ]);
    expect(directory).toEqual([
      {
        id: "coach",
        name: "Nama tampil",
        has_photo: true,
        photo_updated_at: "v1",
      },
    ]);
    expect(publicView(state, member, "2026-09").state.trainers).toBeUndefined();
  });
  it("foto anggota dan pelatih memakai pemilik sendiri; pembersihan mempertahankan referensi kedua peran", () => {
    const state = emptyState();
    state.members = [
      {
        id: "member",
        name: "Anggota",
        nis: "1",
        class_name: "X",
        email: "test@example.test",
        joined_on: "2026-01-01",
        left_on: null,
        active: true,
        photo_path: "member/photo.jpg",
      },
    ];
    ownPhotoProfile(state, coach).photo_path = "coach/photo.jpg";
    expect(ownPhotoProfile(state, member).photo_path).toBe("member/photo.jpg");
    expect(photoReferenced(state, "coach/photo.jpg")).toBe(true);
    expect(photoReferenced(state, "member/photo.jpg")).toBe(true);
    expect(photoReferenced(state, "old.jpg")).toBe(false);
    state.members[0].active = false;
    expect(() => ownPhotoProfile(state, member)).toThrow("tidak aktif");
  });
});
