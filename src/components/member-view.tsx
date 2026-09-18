"use client";

import { useState, type CSSProperties } from "react";
import type { DashboardData, Training } from "@/lib/types";
import { eligible } from "@/lib/engine";
import { InstallPanel } from "./pwa";
import { attendanceTotal, evaluationSummary } from "@/lib/scoring";
import { Avatar, ProfileAvatar, ProfilePhotoEditor } from "./profile-photo";
import { Icon as IconifyIcon } from "@iconify/react";

export type MemberPage =
  | "Dashboard"
  | "Absensi saya"
  | "Perkembangan saya"
  | "Jadwal latihan"
  | "Profil saya"
  | "Ranking bulanan"
  | "Penghargaan"
  | "Kompetensi"
  | "Pengumuman";
export const memberNavigation: { page: MemberPage; label: string }[] = [
  { page: "Dashboard", label: "Beranda" },
  { page: "Absensi saya", label: "Absensi" },
  { page: "Perkembangan saya", label: "Nilai" },
  { page: "Jadwal latihan", label: "Jadwal" },
  { page: "Profil saya", label: "Profil" },
];

export function MemberIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    Dashboard: (
      <>
        <path
          fill="currentColor"
          stroke="none"
          d="M12 2 1 11h3v11h6v-7h4v7h6V11h3L12 2Z"
        />
      </>
    ),
    "Absensi saya": (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" fill="currentColor" />
        <path d="M8 3v4m8-4v4" />
        <path d="m7 14 3 3 6-6" stroke="var(--surface)" />
      </>
    ),
    "Perkembangan saya": (
      <>
        <path fill="currentColor" d="M4 20v-7h3v7Zm6 0V8h3v12Zm6 0V3h3v17Z" />
      </>
    ),
    "Jadwal latihan": (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3M7 18h3" />
      </>
    ),
    "Profil saya": (
      <>
        <circle cx="12" cy="7" r="4" fill="currentColor" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" fill="currentColor" />
      </>
    ),
    "Ranking bulanan": (
      <>
        <path d="M4 21V12h4v9m2 0V4h4v17m2 0v-6h4v6" />
      </>
    ),
    Penghargaan: (
      <>
        <path d="M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4m-5 2v6m-5 1h10" />
      </>
    ),
    Kompetensi: (
      <>
        <path fill="currentColor" d="m12 3 10 5-10 5L2 8l10-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    Pengumuman: (
      <>
        <path fill="currentColor" d="M3 9h5l11-5v15L8 14H3V9Z" />
        <path d="m7 14 2 7h3l-2-6M22 8v7" />
      </>
    ),
    Notifikasi: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4M12 2v2" />
      </>
    ),
    Kembali: <path d="m14 5-7 7 7 7M7 12h14" />,
    Menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    Anggota: (
      <>
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <path fill="currentColor" d="M3 21v-4a6 6 0 0 1 12 0v4Z" />
        <path d="M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v3" />
      </>
    ),
    Laporan: (
      <>
        <path d="M5 3h10l4 4v14H5V3Zm9 0v5h5M8 12h8m-8 4h8" />
      </>
    ),
    Pengaturan: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="2" fill="currentColor" />
        <circle cx="16" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="18" r="2" fill="currentColor" />
      </>
    ),
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.Dashboard}
    </svg>
  );
}

function dateLabel(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
function timeLabel(date: string, timezone: string) {
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone || "Asia/Jakarta",
  });
}
export function memberSummary(data: DashboardData, month: string) {
  const me = data.state.members.find((m) => m.id === data.viewer.id);
  const sessions = data.state.sessions.filter(
    (t) =>
      t.date.startsWith(month) &&
      t.status !== "dibatalkan" &&
      me &&
      eligible(me, t.date),
  );
  const elapsed = sessions.filter(
    (t) =>
      new Date(t.closes_at).getTime() < Date.now() ||
      data.state.attendance.some(
        (a) => a.session_id === t.id && a.member_id === data.viewer.id,
      ),
  );
  const attended = elapsed.filter((t) =>
    data.state.attendance.some(
      (a) =>
        a.session_id === t.id &&
        a.member_id === data.viewer.id &&
        ["hadir", "terlambat"].includes(a.status),
    ),
  ).length;
  return {
    me,
    sessions,
    elapsed,
    attended,
    percentage: elapsed.length
      ? Math.round((attended / elapsed.length) * 100)
      : null,
    own: data.ranking.find((r) => r.id === data.viewer.id),
  };
}

function Identity({ data }: { data: DashboardData }) {
  const me = data.state.members.find((m) => m.id === data.viewer.id);
  return (
    <div className="member-identity">
      <ProfileAvatar data={data} />
      <div>
        <h2>{data.viewer.name}</h2>
        <p>NIS {me?.nis || "Belum tersedia"}</p>
        <small>{me?.class_name || "Kelas belum tersedia"}</small>
      </div>
      <span className={`status ${me?.active ? "good" : ""}`}>
        {me?.active ? "Aktif" : "Nonaktif"}
      </span>
    </div>
  );
}

export function MemberOverview({
  data,
  month,
  navigate,
}: {
  data: DashboardData;
  month: string;
  navigate(page: MemberPage): void;
}) {
  const { attended, elapsed, percentage, own, sessions } = memberSummary(
    data,
    month,
  );
  const scores = evaluationSummary(data.state, data.viewer.id, month);
  const next = [...sessions]
    .filter(
      (t) =>
        t.status === "draf" && new Date(t.closes_at).getTime() >= Date.now(),
    )
    .sort((a, b) => a.opens_at.localeCompare(b.opens_at))[0];
  return (
    <div className="member-overview">
      <Identity data={data} />
      <div className="member-motto">Disiplin dimulai dari kehadiran.</div>
      <div className="member-summary-grid">
        <button
          className="member-summary-card"
          onClick={() => navigate("Absensi saya")}
        >
          <span className="card-heading">
            Kehadiran saya <span aria-hidden="true">›</span>
          </span>
          <span className="summary-content">
            <span
              className="attendance-ring"
              style={{ "--progress": `${percentage ?? 0}%` } as CSSProperties}
            >
              <b>{percentage === null ? "Belum ada" : `${percentage}%`}</b>
            </span>
            <span>
              <strong>
                {attended} dari {elapsed.length} sesi
              </strong>
              <small>Hadir dan terlambat</small>
              <small>Latihan yang sudah berlangsung</small>
            </span>
          </span>
        </button>
        <button
          className="member-summary-card"
          onClick={() => navigate("Perkembangan saya")}
        >
          <span className="card-heading">
            Nilai & poin saya <span aria-hidden="true">›</span>
          </span>
          <span className="summary-content">
            <span
              className="attendance-ring score-ring"
              role="img"
              aria-label={
                scores.percentage === null
                  ? "Belum ada nilai"
                  : `Persentase nilai ${scores.percentage} persen`
              }
              style={{ "--progress": `${scores.percentage ?? 0}%` } as CSSProperties}
            >
              <b>
                {scores.percentage === null
                  ? "Belum ada"
                  : `${scores.percentage}%`}
              </b>
            </span>
            <span>
              <strong>{own?.total ?? 0} poin</strong>
              <small>
                {scores.assessed
                  ? `${scores.total} dari ${scores.max} nilai`
                  : "Menunggu penilaian pelatih"}
              </small>
              <small>
                {own?.incomplete
                  ? `${own.incomplete} catatan belum lengkap`
                  : `Posisi ${own?.rank ?? "belum tersedia"}`}
              </small>
            </span>
          </span>
        </button>
      </div>
      <section className="quick-section">
        <h2>Menu cepat</h2>
        <div className="member-quick-menu">
          {(
            [
              "Absensi saya",
              "Perkembangan saya",
              "Kompetensi",
              "Jadwal latihan",
              "Pengumuman",
              "Profil saya",
            ] as MemberPage[]
          ).map((p) => (
            <button key={p} onClick={() => navigate(p)}>
              <MemberIcon name={p} />
              <span>{p === "Perkembangan saya" ? "Nilai saya" : p}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="member-next-session">
        <div className="section-heading">
          <h2>Latihan berikutnya</h2>
          <MemberIcon name="Jadwal latihan" />
        </div>
        {next ? (
          <>
            <h3>{next.title}</h3>
            <p>
              {dateLabel(next.date)} ·{" "}
              {timeLabel(next.opens_at, data.state.timezone)}
            </p>
            <p>{next.location}</p>
            <button className="full" onClick={() => navigate("Absensi saya")}>
              Buka absensi
            </button>
          </>
        ) : (
          <p>
            Belum ada latihan berikutnya pada periode ini. Jadwal dari pelatih
            akan tampil di sini.
          </p>
        )}
      </section>
    </div>
  );
}

export function MemberAttendance({
  data,
  month,
  onAttend,
}: {
  data: DashboardData;
  month: string;
  onAttend(t: Training): void;
}) {
  const [tab, setTab] = useState<"history" | "summary">("history");
  const { sessions, attended, elapsed, percentage } = memberSummary(
    data,
    month,
  );
  return (
    <section className="panel member-attendance">
      <div className="section-heading">
        <h2>Absensi saya</h2>
        <MemberIcon name="Absensi saya" />
      </div>
      <div className="member-tabs" role="group" aria-label="Tampilan absensi">
        <button
          aria-pressed={tab === "history"}
          onClick={() => setTab("history")}
        >
          Riwayat
        </button>
        <button
          aria-pressed={tab === "summary"}
          onClick={() => setTab("summary")}
        >
          Rekap
        </button>
      </div>
      {tab === "summary" && (
        <dl className="attendance-recap">
          {["hadir", "terlambat", "izin", "sakit", "alpa"].map((status) => (
            <div key={status}>
              <dt>{status}</dt>
              <dd>
                {
                  data.state.attendance.filter(
                    (a) =>
                      a.member_id === data.viewer.id &&
                      a.status === status &&
                      sessions.some((t) => t.id === a.session_id),
                  ).length
                }{" "}
                sesi
              </dd>
            </div>
          ))}
          <div>
            <dt>Belum tercatat</dt>
            <dd>
              {
                elapsed.filter(
                  (t) =>
                    !data.state.attendance.some(
                      (a) =>
                        a.member_id === data.viewer.id && a.session_id === t.id,
                    ),
                ).length
              }{" "}
              sesi
            </dd>
          </div>
        </dl>
      )}
      {tab === "history" &&
        [...sessions]
          .sort((a, b) => b.opens_at.localeCompare(a.opens_at))
          .map((t) => {
            const a = data.state.attendance.find(
              (a) => a.session_id === t.id && a.member_id === data.viewer.id,
            );
            return (
              <article className="member-attendance-row" key={t.id}>
                <time dateTime={t.date}>{dateLabel(t.date)}</time>
                <span
                  className={`attendance-dot ${a?.status ?? "pending"}`}
                  aria-hidden="true"
                >
                  {a?.status === "hadir"
                    ? "✓"
                    : a?.status === "alpa"
                      ? "×"
                      : "•"}
                </span>
                <div>
                  <strong className="attendance-status">
                    {a?.status ??
                      (t.status === "selesai" ? "Belum tercatat" : "Terjadwal")}
                  </strong>
                  <h3>{t.title}</h3>
                  {(a?.qr_checkin || a?.evidence) && (
                    <p>
                      <strong>{data.viewer.name}</strong>
                      <br />
                      Jam absensi:{" "}
                      {timeLabel(
                        (a.qr_checkin ?? a.evidence!).received_at,
                        data.state.timezone,
                      )}
                    </p>
                  )}
                  <p>
                    {timeLabel(t.opens_at, data.state.timezone)} sampai{" "}
                    {timeLabel(t.closes_at, data.state.timezone)} · {t.location}
                  </p>
                  {!a && (
                    <button
                      disabled={t.status !== "draf"}
                      onClick={() => onAttend(t)}
                    >
                      Scan QR absensi
                    </button>
                  )}
                </div>
              </article>
            );
          })}
      {!sessions.length && (
        <div className="empty">
          <h3>Belum ada sesi</h3>
          <p>Jadwal latihan akan muncul setelah dibuat pelatih.</p>
        </div>
      )}
      <div className="member-info">
        <MemberIcon name="Absensi saya" />
        <p>
          Total kehadiran periode ini
          <strong>
            {attended} dari {elapsed.length} sesi
            {percentage === null ? "" : ` (${percentage}%)`}
          </strong>
        </p>
      </div>
    </section>
  );
}

export function MemberSchedule({
  data,
  month,
  navigate,
}: {
  data: DashboardData;
  month: string;
  navigate(page: MemberPage): void;
}) {
  const sessions = data.state.sessions
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => a.opens_at.localeCompare(b.opens_at));
  return (
    <section className="panel">
      <h2>Jadwal latihan</h2>
      {sessions.length ? (
        sessions.map((t) => (
          <article className="member-schedule-row" key={t.id}>
            <div className="section-heading">
              <time dateTime={t.date}>{dateLabel(t.date)}</time>
              <span className="status">
                {t.status === "draf" ? "Terjadwal" : t.status}
              </span>
            </div>
            <h3>{t.title}</h3>
            <p>
              {timeLabel(t.opens_at, data.state.timezone)} sampai{" "}
              {timeLabel(t.closes_at, data.state.timezone)} · {t.location}
            </p>
            <p>{t.material || "Materi akan disampaikan pelatih."}</p>
            <small>
              Scan QR · Tepat waktu hingga{" "}
              {timeLabel(t.on_time_until, data.state.timezone)}
            </small>
            {t.status === "draf" && (
              <button
                className="secondary"
                onClick={() => navigate("Absensi saya")}
              >
                Lihat absensi
              </button>
            )}
          </article>
        ))
      ) : (
        <div className="empty">
          <h3>Belum ada jadwal</h3>
          <p>Latihan akan tampil setelah dijadwalkan pelatih.</p>
        </div>
      )}
    </section>
  );
}

export function MemberScoreTrend({
  data,
  month,
}: {
  data: DashboardData;
  month: string;
}) {
  const points = data.state.attendance
    .filter((a) => a.member_id === data.viewer.id)
    .flatMap((a) => {
      const t = data.state.sessions.find(
        (t) =>
          t.id === a.session_id &&
          t.date.startsWith(month) &&
          t.status !== "dibatalkan",
      );
      const rule = data.state.rules.find((r) => r.month === month);
      return t && rule
        ? [
            {
              ...attendanceTotal(a, rule),
              id: a.id,
              title: t.title,
              date: t.date,
            },
          ]
        : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const max = Math.max(1, ...points.map((p) => p.total));
  return (
    <section className="score-trend">
      <h2>Poin per latihan</h2>
      <p>
        Gabungan poin absensi dan seluruh nilai kriteria yang sudah tercatat.
      </p>
      {points.length ? (
        <ul>
          {points.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.title}</strong>
                <span>{p.total} poin</span>
              </div>
              <div className="score-track" aria-hidden="true">
                <span style={{ width: `${(p.total / max) * 100}%` }} />
              </div>
              <small>
                {dateLabel(p.date)}
                {p.complete ? "" : " · Penilaian belum lengkap"}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h3>Belum ada poin latihan</h3>
          <p>Grafik akan tampil setelah absensi dan aturan poin tersedia.</p>
        </div>
      )}
    </section>
  );
}

export function MemberProfile({
  data,
  navigate,
  dark,
  toggleTheme,
  logout,
  onPhotoSave,
}: {
  data: DashboardData;
  navigate(page: MemberPage): void;
  dark: boolean;
  toggleTheme(): void;
  logout(): void;
  onPhotoSave(file: Blob | null): Promise<boolean>;
}) {
  const me = data.state.members.find((m) => m.id === data.viewer.id);

  return (
    <>
      <section className="panel member-profile">
        <Identity data={data} />
        <ProfilePhotoEditor hasPhoto={!!me?.photo_path} onSave={onPhotoSave} />
        <details className="profile-details">
          <summary>Data diri</summary>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>{me?.email || "Belum tersedia"}</dd>
            </div>
            <div>
              <dt>Bergabung</dt>
              <dd>{me?.joined_on || "Belum tersedia"}</dd>
            </div>
            <div>
              <dt>Sekolah</dt>
              <dd>{data.state.school}</dd>
            </div>
          </dl>
          <p>
            Hubungi pelatih untuk memperbarui identitas atau mengatur ulang kata
            sandi.
          </p>
        </details>
        <details className="profile-details trainer-directory">
          <summary>Info Pelatih</summary>
          {data.trainers.length ? (
            data.trainers.map((trainer) => (
              <div className="trainer-info" key={trainer.id}>
                <Avatar
                  name={trainer.name}
                  src={
                    trainer.has_photo
                      ? `/api/profile/photo?trainer=${encodeURIComponent(trainer.id)}&v=${encodeURIComponent(trainer.photo_updated_at ?? "current")}`
                      : ""
                  }
                />
                <strong>{trainer.name}</strong>
              </div>
            ))
          ) : (
            <p>Informasi pelatih belum tersedia.</p>
          )}
        </details>
        <div className="profile-links">
          {(
            [
              "Absensi saya",
              "Perkembangan saya",
              "Kompetensi",
              "Jadwal latihan",
              "Pengumuman",
              "Ranking bulanan",
              "Penghargaan",
            ] as MemberPage[]
          ).map((p) => (
            <button key={p} onClick={() => navigate(p)}>
              <MemberIcon name={p} />
              <span>{p}</span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        <button
          className="secondary full profile-logout"
          aria-label="Keluar akun"
          onClick={logout}
        >
          Keluar akun
        </button>
      </section>
      <InstallPanel />
      <section className="member-about">
        <h2>Tentang aplikasi</h2>
        <p>
          Absensi Anggota Paskibra {data.state.school}.
        </p>
        <small>Versi 0.1.0</small>
      </section>
    </>
  );
}
