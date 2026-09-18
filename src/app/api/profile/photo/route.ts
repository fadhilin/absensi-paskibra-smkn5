import {
  authenticate,
  errorResponse,
  readState,
  sameOrigin,
  service,
  transact,
} from "@/lib/server";
import { prepareProfileImage } from "@/lib/profile-image";
import { ownPhotoProfile, photoReferenced } from "@/lib/trainer-profile";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await authenticate();
    const { state } = await readState();
    const trainerId = new URL(request.url).searchParams.get("trainer");
    const memberId = new URL(request.url).searchParams.get("member");
    let profile;
    if (memberId) {
      if (viewer.role !== "admin")
        return Response.json(
          { error: "Hanya pelatih dapat melihat foto anggota lain." },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      profile = state.members.find((m) => m.id === memberId);
    } else if (trainerId) {
      const { data: trainer, error } = await service()
        .from("profiles")
        .select("id")
        .eq("id", trainerId)
        .eq("role", "admin")
        .eq("active", true)
        .maybeSingle();
      if (error || !trainer)
        return Response.json(
          { error: "Pelatih tidak tersedia." },
          { status: 404, headers: { "Cache-Control": "no-store" } },
        );
      profile = state.trainers?.find((p) => p.id === trainerId);
    } else profile = ownPhotoProfile(state, viewer);
    if (!profile?.photo_path)
      return Response.json(
        { error: "Foto profil belum tersedia." },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    const { data, error } = await service()
      .storage.from("avatars")
      .download(profile.photo_path);
    if (error || !data) throw new Error("Foto profil gagal dibaca.");
    return new Response(await data.arrayBuffer(), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function removeUnreferenced(path: string) {
  // Hasil commit dapat tidak pasti ketika jaringan putus; periksa referensi sebelum menghapus.
  try {
    const { state } = await readState();
    if (!photoReferenced(state, path))
      await service().storage.from("avatars").remove([path]);
  } catch {
    /* Objek yang belum pasti direkonsiliasi melalui prosedur operasional. */
  }
}

async function changePhoto(request: Request, remove: boolean) {
  let uploaded: string | undefined;
  try {
    await sameOrigin();
    const viewer = await authenticate();
    if (!remove) {
      if (Number(request.headers.get("content-length") ?? 0) > 2300000)
        throw new Error("Foto profil maksimal 2 MB.");
      const form = await request.formData();
      const file = form.get("photo");
      if (!(file instanceof File))
        throw new Error("Pilih foto profil terlebih dahulu.");
      const bytes = await prepareProfileImage(file);
      const path = `${viewer.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await service()
        .storage.from("avatars")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      if (error)
        throw new Error(
          "Foto gagal disimpan. Pastikan migrasi 003 sudah dijalankan.",
        );
      uploaded = path;
    }
    let previous: string | undefined;
    const photoPath = uploaded;
    await transact((state) => {
      const member = ownPhotoProfile(state, viewer);
      previous = member.photo_path;
      if (photoPath) member.photo_path = photoPath;
      else delete member.photo_path;
      member.photo_updated_at = new Date().toISOString();
      state.audits.push({
        id: crypto.randomUUID(),
        at: member.photo_updated_at,
        actor: viewer.id,
        action: remove ? "Hapus foto profil" : "Ubah foto profil",
        reason: "Perubahan oleh pemilik akun",
        before: { has_photo: !!previous },
        after: { has_photo: !!photoPath },
      });
      return state;
    });
    uploaded = undefined;
    if (previous) await removeUnreferenced(previous);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (uploaded) await removeUnreferenced(uploaded);
    return errorResponse(error);
  }
}
export function POST(request: Request) {
  return changePhoto(request, false);
}
export function DELETE(request: Request) {
  return changePhoto(request, true);
}
