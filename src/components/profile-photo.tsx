"use client";
import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/types";

export function usePhotoUrl(blob: Blob | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
export function ProfileAvatar({ data }: { data: DashboardData }) {
  const member = data.state.members.find((m) => m.id === data.viewer.id);
  const trainer = data.trainers.find((t) => t.id === data.viewer.id);
  const hasPhoto =
    data.viewer.role === "admin" ? trainer?.has_photo : !!member?.photo_path;
  const updated =
    data.viewer.role === "admin"
      ? trainer?.photo_updated_at
      : member?.photo_updated_at;
  const src = hasPhoto
    ? `/api/profile/photo?v=${encodeURIComponent(updated ?? "current")}`
    : "";
  return <Avatar name={data.viewer.name} src={src} />;
}
export function Avatar({ name, src, className = "member-avatar" }: { name: string; src: string; className?: string }) {
  const [failed, setFailed] = useState("");
  return src && failed !== src ? (
    <img
      className={`${className} profile-image`}
      src={src}
      alt={`Foto profil ${name}`}
      onError={() => setFailed(src)}
    />
  ) : (
    <span className={className} aria-hidden="true">
      {name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function ProfilePhotoEditor({
  hasPhoto,
  onSave,
}: {
  hasPhoto: boolean;
  onSave(file: Blob | null): Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  const preview = usePhotoUrl(file);
  async function save(deleting = false) {
    if (!deleting && !file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let photo: Blob | null = null;
      if (!deleting && file) {
        const bitmap = await createImageBitmap(file);
        try {
          if (bitmap.width * bitmap.height > 16000000)
            throw new Error("Foto maksimal 16 megapiksel.");
          const side = Math.min(bitmap.width, bitmap.height);
          const canvas = document.createElement("canvas");
          canvas.width = 512;
          canvas.height = 512;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Foto gagal diproses di browser ini.");
          context.drawImage(
            bitmap,
            (bitmap.width - side) / 2,
            (bitmap.height - side) / 2,
            side,
            side,
            0,
            0,
            512,
            512,
          );
          photo = await new Promise<Blob>((resolve, reject) =>
            canvas.toBlob(
              (blob) =>
                blob
                  ? resolve(blob)
                  : reject(new Error("Foto gagal diproses.")),
              "image/jpeg",
              0.85,
            ),
          );
        } finally {
          bitmap.close();
        }
      }
      if (await onSave(photo)) {
        setFile(null);
        setRemove(false);
        setMessage(
          deleting ? "Foto profil dihapus." : "Foto profil diperbarui.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Foto tidak dapat dibuka. Pilih JPG, PNG, atau WebP lain.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="profile-photo-editor">
      <summary>Ubah foto profil</summary>
      <p>
        JPG, PNG, atau WebP, maksimal 2 MB. Bagian tengah foto dipotong menjadi
        persegi.
      </p>
      <label className="field">
        <span>Pilih foto profil</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const next = event.target.files?.[0];
            setError("");
            setMessage("");
            setRemove(false);
            setFile(null);
            if (!next) return;
            if (
              next.size > 2 * 1024 * 1024 ||
              !["image/jpeg", "image/png", "image/webp"].includes(next.type)
            ) {
              setError(
                "Pilih JPG, PNG, atau WebP dengan ukuran maksimal 2 MB.",
              );
              event.target.value = "";
              return;
            }
            setFile(next);
          }}
        />
      </label>
      {preview && (
        <img
          className="profile-photo-preview"
          src={preview}
          alt="Pratinjau foto profil baru"
          onError={() => {
            setError("Foto tidak dapat dibuka. Pilih gambar lain.");
            setFile(null);
          }}
        />
      )}
      <div className="actions">
        <button type="button" disabled={!file || busy} onClick={() => save()}>
          {busy ? "Menyimpan..." : "Simpan foto profil"}
        </button>
        {file && (
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={() => setFile(null)}
          >
            Batal
          </button>
        )}
        {hasPhoto && (
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={() => setRemove(true)}
          >
            Hapus foto
          </button>
        )}
      </div>
      {remove && (
        <div className="inline-note">
          <p>Hapus foto profil dan gunakan inisial nama?</p>
          <div className="actions">
            <button disabled={busy} onClick={() => save(true)}>
              Ya, hapus foto
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => setRemove(false)}
            >
              Batal hapus
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </details>
  );
}
