import { z } from "zod";
import type { State, Viewer, TrainerInfo } from "./types";

export function trainerProfile(state: State, viewer: Viewer) {
  if (viewer.role !== "admin")
    throw new Error("Hanya pelatih dapat mengubah profil pelatih.");
  state.trainers ??= [];
  let profile = state.trainers.find((p) => p.id === viewer.id);
  if (!profile) {
    profile = { id: viewer.id, name: viewer.name };
    state.trainers.push(profile);
  }
  return profile;
}
export function updateTrainerProfile(
  state: State,
  viewer: Viewer,
  input: unknown,
) {
  const value = z
    .object({ name: z.string().trim().min(2).max(100) })
    .parse(input);
  const profile = trainerProfile(state, viewer);
  const before = { name: profile.name };
  Object.assign(profile, value);
  state.audits.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: viewer.id,
    action: "Ubah profil pelatih",
    reason: "Perubahan oleh pemilik akun",
    before,
    after: value,
  });
  return state;
}
export function trainerDirectory(
  state: State,
  profiles: { id: string; name: string; role: string; active: boolean }[],
): TrainerInfo[] {
  return profiles
    .filter((p) => p.active && p.role === "admin")
    .map((account) => {
      const profile = state.trainers?.find((p) => p.id === account.id);
      return {
        id: account.id,
        name: profile?.name ?? account.name,
        has_photo: !!profile?.photo_path,
        photo_updated_at: profile?.photo_updated_at,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}
export function ownPhotoProfile(state: State, viewer: Viewer) {
  if (viewer.role === "admin") return trainerProfile(state, viewer);
  const member = state.members.find((m) => m.id === viewer.id && m.active);
  if (!member) throw new Error("Keanggotaan tidak aktif.");
  return member;
}
export function photoReferenced(state: State, path: string) {
  return (
    state.members.some((m) => m.photo_path === path) ||
    !!state.trainers?.some((p) => p.photo_path === path)
  );
}
