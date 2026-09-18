"use client";
import type { DashboardData } from "@/lib/types";
import { MemberIcon } from "./member-view";
import { InstallPanel } from "./pwa";
import { useState } from "react";
import { ProfileAvatar, ProfilePhotoEditor } from "./profile-photo";
import { TrainerAttendance } from "./trainer-attendance";

export type TrainerPage =
  | "Dashboard"
  | "Anggota"
  | "Latihan & absensi"
  | "Penilaian"
  | "Profil pelatih"
  | "Ranking bulanan"
  | "Kompetensi"
  | "Pengumuman"
  | "Penghargaan"
  | "Laporan"
  | "Pengaturan";
export const trainerNavigation: {
  page: TrainerPage;
  label: string;
  icon: string;
}[] = [
  { page: "Dashboard", label: "Beranda", icon: "Dashboard" },
  { page: "Anggota", label: "Anggota", icon: "Anggota" },
  { page: "Latihan & absensi", label: "Absensi", icon: "Absensi saya" },
  { page: "Penilaian", label: "Nilai", icon: "Perkembangan saya" },
  { page: "Profil pelatih", label: "Profil", icon: "Profil saya" },
];
const quickLinks: { page: TrainerPage; label: string; icon: string }[] = [
  { page: "Anggota", label: "Anggota", icon: "Anggota" },
  { page: "Penilaian", label: "Penilaian", icon: "Perkembangan saya" },
  { page: "Kompetensi", label: "Kompetensi", icon: "Kompetensi" },
  {
    page: "Latihan & absensi",
    label: "Jadwal & absensi",
    icon: "Jadwal latihan",
  },
  { page: "Pengumuman", label: "Pengumuman", icon: "Pengumuman" },
  { page: "Ranking bulanan", label: "Ranking", icon: "Penghargaan" },
];
function TrainerIdentity({ data }: { data: DashboardData }) {
  return (
    <div className="member-identity">
      <ProfileAvatar data={data} />
      <div>
        <h2>{data.viewer.name}</h2>
        <p>Pelatih Paskibra</p>
      </div>
    </div>
  );
}
export function TrainerOverview({
  data,
  month,
  incomplete,
  navigate,
  onSession,
}: {
  data: DashboardData;
  month: string;
  incomplete: number;
  navigate(page: TrainerPage): void;
  onSession(id: string, date: string): void;
}) {
  const sessions = data.state.sessions.filter(
    (s) => s.date.startsWith(month) && s.status !== "dibatalkan",
  );
  return (
    <section className="trainer-overview">
      <TrainerIdentity data={data} />
      <TrainerAttendance state={data.state} onMembers={() => navigate("Anggota")} onSession={onSession} />
      <div className="member-summary-grid">
        <button
          className="member-summary-card"
          onClick={() => navigate("Penilaian")}
        >
          <span className="card-heading">
            Catatan latihan <span aria-hidden="true">›</span>
          </span>
          <div className="summary-content">
            <span className="member-point-value">{incomplete}</span>
            <div>
              <strong>Perlu dilengkapi</strong>
              <small>
                Absensi atau nilai dari {sessions.length} sesi bulan ini
              </small>
            </div>
          </div>
        </button>
      </div>
      <section className="quick-section">
        <h2>Menu cepat</h2>
        <div className="member-quick-menu">
          {quickLinks.map((item) => (
            <button key={item.page} onClick={() => navigate(item.page)}>
              <MemberIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
export function TrainerProfile({
  data,
  navigate,
  dark,
  toggleTheme,
  logout,
  onPhotoSave,
  onProfileSave,
}: {
  data: DashboardData;
  navigate(page: TrainerPage): void;
  dark: boolean;
  toggleTheme(): void;
  logout(): void;
  onPhotoSave(file: Blob | null): Promise<boolean>;
  onProfileSave(name: string): Promise<boolean>;
}) {
  const [name, setName] = useState(data.viewer.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const trainer = data.trainers.find((p) => p.id === data.viewer.id);
  const links: { page: TrainerPage; label: string; icon: string }[] = [
    ...quickLinks,
    { page: "Penghargaan", label: "Penghargaan", icon: "Penghargaan" },
    { page: "Laporan", label: "Laporan bulanan", icon: "Laporan" },
    { page: "Pengaturan", label: "Pengaturan sekolah", icon: "Pengaturan" },
  ];
  return (
    <section className="panel trainer-profile">
      <div className="trainer-identity-row">
        <TrainerIdentity data={data} />
      </div>
      <ProfilePhotoEditor
        hasPhoto={!!trainer?.has_photo}
        onSave={onPhotoSave}
      />
      <details className="profile-details trainer-profile-editor">
        <summary>Edit nama pelatih</summary>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setSaved(false);
            try {
              setSaved(await onProfileSave(name));
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="field">
            <span>Nama pelatih</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              minLength={2}
              maxLength={100}
              required
              disabled={saving}
            />
          </label>
          <button disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan nama"}
          </button>
          {saved && <p role="status">Nama pelatih diperbarui.</p>}
        </form>
      </details>
      <h2 className="profile-section-title">Kelola Paskibra</h2>
      <div className="profile-links">
        {links.map((item) => (
          <button key={item.page} onClick={() => navigate(item.page)}>
            <MemberIcon name={item.icon} />
            <span>{item.label}</span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <div className="trainer-account-actions">
        <InstallPanel />
        <button className="secondary" onClick={logout}>
          Keluar akun
        </button>
      </div>
    </section>
  );
}
