"use client";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { eligible, isCertified, ranking, schoolDate } from "@/lib/engine";
import { DashboardData, Member, Ranking, Training } from "@/lib/types";
import { parseCSV, toCSV } from "@/lib/csv";
import { QrScanner, TrainingQr, type QrReceipt } from "./qr-attendance";
import { readableError } from "@/lib/errors";
import { InstallPanel } from "./pwa";
import { Announcements, Competencies } from "./learning";
import { CriteriaEditor, CriteriaGrading } from "./grading";
import {
  TrainerOverview,
  TrainerProfile,
  trainerNavigation,
} from "./trainer-view";
import { MemberScores } from "./member-scores";
import { MemberProgressCards } from "./member-progress";
import { referenceCriteria } from "@/lib/scoring";
import {
  MemberAttendance,
  MemberIcon,
  MemberOverview,
  MemberProfile,
  MemberSchedule,
  memberNavigation,
} from "./member-view";
import { Icon as IconifyIcon } from "@iconify/react";
import { Avatar } from "./profile-photo";

type Page =
  | "Dashboard"
  | "Anggota"
  | "Latihan & absensi"
  | "Penilaian"
  | "Ranking bulanan"
  | "Penghargaan"
  | "Laporan"
  | "Pengaturan"
  | "Absensi saya"
  | "Perkembangan saya"
  | "Jadwal latihan"
  | "Profil saya"
  | "Profil pelatih"
  | "Kompetensi"
  | "Pengumuman";
type Modal = { title: string; kind: string; data?: Member | Training | string };
const adminPages: Page[] = [
  "Dashboard",
  "Anggota",
  "Latihan & absensi",
  "Penilaian",
  "Ranking bulanan",
  "Penghargaan",
  "Laporan",
  "Pengaturan",
  "Kompetensi",
  "Pengumuman",
  "Profil pelatih",
];
const memberPages: Page[] = [
  "Dashboard",
  "Absensi saya",
  "Perkembangan saya",
  "Ranking bulanan",
  "Penghargaan",
  "Jadwal latihan",
  "Profil saya",
  "Kompetensi",
  "Pengumuman",
];
const descriptions: Record<Page, string> = {
  Dashboard: "Pantau latihan dan perkembangan anggota dalam satu tempat.",
  Anggota: "Kelola keanggotaan dan akses akun Paskibra.",
  "Latihan & absensi": "Atur sesi latihan dan periksa kehadiran anggota.",
  Penilaian: "Atur kriteria dan catat nilai latihan anggota.",
  "Ranking bulanan": "Setiap latihan, setiap kontribusi, tercatat.",
  Penghargaan: "Apresiasi untuk konsistensi dan semangat berlatih.",
  Laporan: "Rekap kehadiran dan perolehan poin per periode.",
  Pengaturan: "Identitas sekolah dan aturan poin latihan.",
  "Absensi saya": "Scan QR dari pelatih untuk mencatat kehadiran.",
  "Perkembangan saya": "Lihat rincian poin dan catatan latihan Anda.",
  "Jadwal latihan": "Jadwal, lokasi, dan materi latihan dari pelatih.",
  "Profil saya": "Identitas keanggotaan dan pengaturan aplikasi.",
  "Profil pelatih": "Akun pelatih dan pengelolaan Paskibra.",
  Kompetensi: "Catatan penguasaan keterampilan anggota.",
  Pengumuman: "Informasi dan arahan terbaru dari pelatih.",
};
const icons: Record<string, ReactNode> = {
  Dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  Anggota: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
    </>
  ),
  "Latihan & absensi": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 2v6m10-6v6M3 11h18m-13 5h3m3 0h3" />
    </>
  ),
  Penilaian: (
    <>
      <path d="m4 17 12-12 4 4L8 21H4v-4Zm10-10 4 4M4 3h7" />
    </>
  ),
  "Ranking bulanan": (
    <>
      <path d="M4 21V12h4v9m2 0V4h4v17m2 0v-7h4v7M2 21h20" />
    </>
  ),
  Penghargaan: (
    <>
      <path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm10 2h4v3a4 4 0 0 1-4 4M7 5H3v3a4 4 0 0 0 4 4m5 2v6m-5 1h10" />
    </>
  ),
  Laporan: (
    <>
      <path d="M5 3h10l4 4v14H5V3Zm9 0v5h5M8 12h8m-8 4h8" />
    </>
  ),
  Pengaturan: (
    <>
      <path d="M3 6h18M3 12h18M3 18h18" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </>
  ),
};
function Icon({ name }: { name: string }) {
  if (
    [
      "Kompetensi",
      "Pengumuman",
      "Profil saya",
      "Perkembangan saya",
      "Absensi saya",
      "Jadwal latihan",
    ].includes(name)
  )
    return <MemberIcon name={name} />;
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name] ?? icons["Latihan & absensi"]}
    </svg>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Status({ children }: { children: ReactNode }) {
  return (
    <span
      className={`status ${children === "hadir" || children === "Disahkan" ? "good" : ""}`}
    >
      {children}
    </span>
  );
}
function Empty({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function monthLabel(month: string) {
  return new Date(month + "-02T12:00:00Z").toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}
function dateLabel(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function timeLabel(date: string, tz: string) {
  return new Date(date).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz || "Asia/Jakarta",
  });
}
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
}
function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form));
}

export default function App() {
  const [page, setPage] = useState<Page>("Dashboard"),
    [month, setMonth] = useState(() =>
      schoolDate(new Date(), "Asia/Jakarta").slice(0, 7),
    );
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [configured, setConfigured] = useState(false),
    [login, setLogin] = useState(false),
    [dark, setDark] = useState(false),
    [search, setSearch] = useState(""),
    [sessionId, setSessionId] = useState(""),
    [modal, setModal] = useState<Modal | null>(null),
    [modalError, setModalError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const requestVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      const r = await fetch("/api/app?month=" + month);
      const result = await r.json();
      if (version !== requestVersion.current) return;
      if (!r.ok) {
        if (r.status === 401) {
          // API memeriksa konfigurasi sebelum autentikasi; 401 berarti siap login.
          setConfigured(true);
          setLogin(true);
          setData(null);
          return;
        }
        throw new Error(result.error);
      }
      setConfigured(result.configured);
      if (result.configured) {
        setData(result);
        setLogin(false);
      } else setLogin(true);
    } catch (e) {
      if (version === requestVersion.current)
        setError(e instanceof Error ? e.message : "Data gagal dimuat.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (data?.viewer.role !== "admin" || page !== "Latihan & absensi") return;
    const interval = setInterval(() => {
      if (!document.hidden) refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [data?.viewer.role, page, refresh]);
  useEffect(() => {
    const saved = localStorage.getItem("paskibra-theme");
    setDark(saved === "dark");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("paskibra-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    setModalError("");
    if (modal && !dialog.current?.open) dialog.current?.showModal();
    if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);
  const open = (m: Modal) => {
    setModalError("");
    setModal(m);
  };
  function navigate(p: Page) {
    setPage(p);
    setSearch("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function mutate(action: string, input: unknown) {
    setBusy(true);
    setModalError("");
    try {
      {
        const r = await fetch("/api/app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, data: input }),
        });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        await refresh();
      }
      setNotice("Perubahan berhasil disimpan.");
      return true;
    } catch (e) {
      const message = readableError(e);
      setModalError(message);
      setError(message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    requestVersion.current++;
    setData(null);
    setLogin(true);
    setPage("Dashboard");
  }
  async function saveProfilePhoto(file: Blob | null) {
    try {
      {
        const body = new FormData();
        if (file) body.set("photo", file, "profile.jpg");
        const response = await fetch("/api/profile/photo", {
          method: file ? "POST" : "DELETE",
          ...(file ? { body } : {}),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        await refresh();
      }
      return true;
    } catch (e) {
      setError(readableError(e));
      return false;
    }
  }
  async function saveTrainerProfile(name: string) {
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await refresh();
      return true;
    } catch (error) {
      setError(readableError(error));
      return false;
    }
  }
  async function loginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formValues(e.currentTarget),
          remember: new FormData(e.currentTarget).get("remember") === "on",
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal masuk.");
    } finally {
      setBusy(false);
    }
  }
  async function createMembers(rows: unknown[]) {
    setBusy(true);
    setModalError("");
    try {
      {
        const r = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const res = await r.json();
        if (!r.ok) throw new Error(res.error);
        await refresh();
        const failed = res.results.filter((x: { ok: boolean }) => !x.ok);
        if (failed.length) {
          setModalError(
            failed
              .map(
                (x: { row: number; error: string }) =>
                  `Baris ${x.row}: ${x.error}`,
              )
              .join("\n"),
          );
          return false;
        }
      }
      setNotice("Anggota berhasil ditambahkan.");
      return true;
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Impor gagal.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submitModal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modal) return;
    const form = e.currentTarget;
    const v = formValues(form);
    let ok = false;
    setModalError("");
    try {
      if (modal.kind === "member") ok = await createMembers([v]);
      else if (modal.kind === "edit-member") {
        const m = modal.data as Member;
        ok = await mutate("member-update", {
          ...v,
          id: m.id,
          active: v.active === "true",
        });
      } else if (modal.kind === "import") {
        const file = new FormData(form).get("csv");
        if (!(file instanceof File)) throw new Error("Pilih berkas CSV.");
        ok = await createMembers(parseCSV(await file.text()));
      } else if (modal.kind === "session") {
        const offset =
          data?.state.timezone === "Asia/Makassar"
            ? "+08:00"
            : data?.state.timezone === "Asia/Jayapura"
              ? "+09:00"
              : "+07:00";
        ok = await mutate("session", {
          ...v,
          id: (modal.data as Training | undefined)?.id,
          opens_at: `${v.date}T${v.opens_at}:00${offset}`,
          on_time_until: `${v.date}T${v.on_time_until}:00${offset}`,
          closes_at: `${v.date}T${v.closes_at}:00${offset}`,
        });
        if (ok) {
          navigate("Latihan & absensi");
          setNotice(
            "Latihan tersimpan. Tekan Generate QR pada latihan untuk menampilkan, mengunduh, atau membagikan QR.",
          );
        }
      } else if (["cancel-session", "certify", "reopen"].includes(modal.kind))
        ok = await mutate(modal.kind, { ...v, id: modal.data, month });
      else if (modal.kind === "correction")
        ok = await mutate("attendance-correction", {
          ...v,
          session_id: sessionId,
        });
      else if (modal.kind === "achievement")
        ok = await mutate("achievement", v);
      else if (modal.kind === "reset") {
        {
          setBusy(true);
          const r = await fetch("/api/members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "reset-password",
              id: modal.data,
              password: v.password,
            }),
          });
          const result = await r.json();
          if (!r.ok) throw new Error(result.error);
          ok = true;
          setNotice("Kata sandi berhasil diatur ulang.");
        }
      }
      if (ok) setModal(null);
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }
  async function scanQr(token: string, session: Training): Promise<QrReceipt> {
    const response = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, session_id: session.id }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await refresh();
    return result;
  }
  if (loading)
    return (
      <main className="loading" role="status">
        <div>
          <img
            src="/logo-paskibra.png"
            width="112"
            height="112"
            alt="Tempat logo Paskibra"
            className="login-logo"
          />
        </div>
        <p>Bentar lagi loading...</p>
      </main>
    );
  if (!data || login)
    return (
      <main className="login-screen">
        <section className="login-panel" aria-labelledby="login-title">
          <header className="login-identity">
            <img
              src="/logo-paskibra-round.png"
              width="112"
              height="112"
              alt="Tempat logo Paskibra"
              className="login-logo"
            />
            <h1 id="login-title">
              <span>PASKIBRA</span>
              <strong>SMKN 5 JAKARTA</strong>
            </h1>
          </header>
          <div>
            <form className="login-fields" onSubmit={loginSubmit}>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="Nama@gmail.com"
                  required
                />
              </Field>
              <Field label="Kata sandi">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                />
              </Field>
              <label className="remember-login">
                <input type="checkbox" name="remember" />
                <span>Ingat saya</span>
              </label>
              {error && (
                <p className="notice error" role="alert">
                  {error}
                </p>
              )}
              <button className="full" disabled={busy || !configured}>
                {busy ? "Memeriksa akun..." : "Masuk"}
              </button>
            </form>
            <p className="small">
              Lupa kata sandi? Hubungi pelatih untuk mengatur ulang.
            </p>
            {!configured && (
              <div className="setup-note">
                <strong>Penyiapan layanan diperlukan</strong>
                <p>Buat akun terlebih dahulu!</p>
              </div>
            )}
          </div>
        </section>
        <div className="page-art login-art" aria-hidden="true">
          <img src="/logo-login.png" alt="" width="360" height="360" draggable={false} />
        </div>
      </main>
    );
  const s = data.state,
    admin = data.viewer.role === "admin",
    rows = data.ranking,
    certified = isCertified(s, month),
    periodSessions = s.sessions.filter((t) => t.date.startsWith(month)),
    activeSessions = periodSessions.filter((t) => t.status !== "dibatalkan");
  const incomplete = admin
    ? rows.reduce((n, r) => n + (r.incomplete || 0), 0)
    : 0;
  const selected =
    periodSessions.find((t) => t.id === sessionId) ??
    periodSessions.find((t) => t.status !== "dibatalkan");
  const completed = s.results.filter((r) => !r.reopened_at);
  const visibleMembers = s.members.filter((m) =>
    `${m.name} ${m.nis} ${m.class_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const selectedAtt = selected
    ? s.attendance.filter((a) => a.session_id === selected.id)
    : [];
  const filteredRows = rows.filter((r) =>
    `${r.name} ${r.class_name}`.toLowerCase().includes(search.toLowerCase()),
  );
  const memberName = (id: string) =>
    s.members.find((m) => m.id === id)?.name ??
    rows.find((m) => m.id === id)?.name ??
    id;
  const exportReport = () =>
    download(
      `rekap-paskibra-${month}.csv`,
      toCSV([
        ["Periode", month],
        ["Dibuat", new Date().toISOString()],
        ["Status", certified ? "Disahkan" : "Sementara"],
        [
          "Posisi",
          "Nama",
          "Kelas",
          "Hadir",
          "Terlambat",
          "Izin",
          "Sakit",
          "Alpa",
          "Poin absensi",
          "Nilai latihan",
          "Total",
          "Belum lengkap",
          "Pemenang",
        ],
        ...rows.map((r) => [
          r.rank,
          r.name,
          r.class_name,
          r.hadir,
          r.terlambat,
          r.izin,
          r.sakit,
          r.alpa,
          r.attendance,
          r.evaluation ?? r.activity + r.skill,
          r.total,
          r.incomplete,
          completed.some((c) => c.month === month && c.winners.includes(r.id))
            ? "Ya"
            : "",
        ]),
      ]),
    );
  const rankingsTable = (report = false) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Posisi</th>
            <th>Anggota</th>
            {report && (
              <>
                <th>H / T / I / S / A</th>
                <th>Absensi</th>
                <th>Nilai latihan</th>
                <th>Belum lengkap</th>
              </>
            )}
            <th className="right">Total poin</th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r) => (
            <tr key={r.id}>
              <td>
                <span
                  className={`rank ${r.rank === 1 && r.total > 0 ? "first" : ""}`}
                >
                  {String(r.rank).padStart(2, "0")}
                </span>
              </td>
              <td>
                <div className="person">
                  <span className="avatar">{initials(r.name)}</span>
                  <div>
                    <strong>
                      {r.name}
                      {r.id === data.viewer.id ? " (Anda)" : ""}
                    </strong>
                    <small>{r.class_name}</small>
                  </div>
                </div>
              </td>
              {report && (
                <>
                  <td>
                    {r.hadir} / {r.terlambat} / {r.izin} / {r.sakit} / {r.alpa}
                  </td>
                  <td>{r.attendance}</td>
                  <td>{r.evaluation ?? r.activity + r.skill}</td>
                  <td>{r.incomplete}</td>
                </>
              )}
              <td className="right points">
                {r.total}
                <small> poin</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredRows.length && (
        <Empty
          title="Belum ada hasil"
          description="Hasil akan muncul setelah anggota dan latihan tersedia pada periode ini."
        />
      )}
    </div>
  );
  return (
    <div
      className={`app-shell ${admin ? "trainer-app" : "member-app"}`}
      data-page={page}
    >
      <a href="#main" className="skip">
        Lewati ke konten
      </a>
      <aside className="sidebar">
        <div className="brand">
          <span>
            <img
              src="/logo-paskibra.jpg"
              width="112"
              height="112"
              alt="Tempat logo Paskibra"
              className="login-logo"
            />
          </span>
          <strong>
            PASKIBRA<span>SMKN 5 JAKARTA</span>
          </strong>
        </div>
        <div className="workspace">
          <span className="workspace-icon">P</span>
          <div>
            <strong>{s.school}</strong>
            <small>{admin ? "Pelatih" : "Anggota"}</small>
          </div>
        </div>
        <div className="nav-label">Menu utama</div>
        <nav aria-label="Navigasi utama">
          {(admin ? adminPages : memberPages).map((p) => (
            <button
              key={p}
              className={page === p ? "active" : ""}
              onClick={() => navigate(p)}
              aria-current={page === p ? "page" : undefined}
            >
              <MemberIcon
                name={
                  p === "Penilaian"
                    ? "Perkembangan saya"
                    : p === "Latihan & absensi"
                      ? "Absensi saya"
                      : p === "Profil pelatih"
                        ? "Profil saya"
                        : p
                }
              />
              {p}
              {p === "Penilaian" && incomplete > 0 && (
                <span className="nav-count">{incomplete}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="account">
            <span className="avatar">{initials(data.viewer.name)}</span>
            <div>
              <strong>{data.viewer.name}</strong>
              <small>{admin ? "Pelatih / Admin" : "Anggota"}</small>
            </div>
            <button
              className="icon-button"
              onClick={logout}
              aria-label="Keluar akun"
            >
              ↪
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          {
            <div className="member-header-title">
              {page === "Dashboard" ? (
                <img
                  src="/logo-paskibra-round.png"
                  width="40"
                  height="40"
                  alt="Logo Paskibra"
                  className="header-school-logo"
                />
              ) : (
                <button
                  className="member-back-button"
                  aria-label="Kembali ke beranda"
                  onClick={() => navigate("Dashboard")}
                >
                  <MemberIcon name="Kembali" />
                </button>
              )}
              <strong>
                {page === "Dashboard" ? (
                  <>
                    <span className="header-school-line">PASKIBRA</span>
                    <span className="header-school-line">SMKN 5 JAKARTA</span>
                  </>
                ) : page === "Perkembangan saya" ? (
                  "Nilai & kemajuan"
                ) : (
                  page
                )}
              </strong>
            </div>
          }
          <div className="topbar-right">
            <span>{schoolDate(new Date(), s.timezone)}</span>
            <button
              className="secondary icon-only"
              aria-label="Ubah tampilan"
              onClick={() => setDark(!dark)}
            >
              <IconifyIcon
                icon={
                  dark
                    ? "material-symbols:light-mode-rounded"
                    : "material-symbols:dark-mode-rounded"
                }
                width={18}
                height={18}
              />
            </button>
            {
              <button
                className="member-profile-button"
                aria-label="Buka pengumuman"
                onClick={() => navigate("Pengumuman")}
              >
                <MemberIcon name="Notifikasi" />
              </button>
            }
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "Dashboard" ? "Ringkasan kegiatan" : "Paskibra"}
              </span>
              <h1>
                {page === "Dashboard"
                  ? `Selamat datang, ${admin ? "Pelatih" : data.viewer.name.split(" ")[0]}`
                  : page}
              </h1>
              <p>
                {page === "Dashboard" && !admin
                  ? "Kehadiran dan perkembangan latihan Anda."
                  : descriptions[page]}
              </p>
            </div>
            <div className="heading-actions">
              <label className="month-select">
                <span className="sr-only">Periode</span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => e.target.value && setMonth(e.target.value)}
                />
              </label>
              {page === "Dashboard" && admin && (
                <button
                  className="cta-quiet"
                  onClick={() =>
                    open({ kind: "session", title: "Buat latihan" })
                  }
                >
                  + Buat latihan
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button
                onClick={() => setError("")}
                aria-label="Tutup pesan kesalahan"
              >
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button
                onClick={() => setNotice("")}
                aria-label="Tutup pemberitahuan"
              >
                ×
              </button>
            </div>
          )}
          {page === "Dashboard" && !admin && (
            <MemberOverview data={data} month={month} navigate={navigate} />
          )}
          {page === "Kompetensi" && (
            <Competencies data={data} busy={busy} mutate={mutate} />
          )}
          {page === "Pengumuman" && (
            <Announcements data={data} busy={busy} mutate={mutate} />
          )}
          {page === "Jadwal latihan" && !admin && (
            <MemberSchedule data={data} month={month} navigate={navigate} />
          )}
          {page === "Profil saya" && !admin && (
            <MemberProfile
              data={data}
              navigate={navigate}
              dark={dark}
              toggleTheme={() => setDark(!dark)}
              logout={logout}
              onPhotoSave={saveProfilePhoto}
            />
          )}
          {page === "Dashboard" && admin && (
            <>
              <TrainerOverview
                data={data}
                month={month}
                incomplete={incomplete}
                navigate={navigate}
              />
              <div className="dashboard-columns">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>Agenda latihan</h2>
                      <p>{monthLabel(month)}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate(admin ? "Latihan & absensi" : "Absensi saya")
                      }
                    >
                      Lihat semua
                    </button>
                  </div>
                  {!periodSessions.length ? (
                    <Empty
                      title="Belum ada latihan"
                      description="Buat sesi pertama setelah menetapkan aturan poin."
                    />
                  ) : (
                    <div className="agenda-list">
                      {[...periodSessions]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 4)
                        .map((t) => (
                          <button
                            className="agenda-row"
                            key={t.id}
                            onClick={() => {
                              setSessionId(t.id);
                              navigate(
                                admin ? "Latihan & absensi" : "Absensi saya",
                              );
                            }}
                          >
                            <div className="date-block">
                              <span>
                                {new Date(
                                  t.date + "T12:00:00Z",
                                ).toLocaleDateString("id-ID", {
                                  month: "short",
                                })}
                              </span>
                              <strong>{t.date.slice(8)}</strong>
                            </div>
                            <div className="agenda-body">
                              <Status>
                                {t.status === "draf" ? "Terjadwal" : t.status}
                              </Status>
                              <h3>{t.title}</h3>
                              <p>
                                {timeLabel(t.opens_at, s.timezone)} –{" "}
                                {timeLabel(t.closes_at, s.timezone)} ·{" "}
                                {t.location}
                              </p>
                            </div>
                            <span aria-hidden="true">›</span>
                          </button>
                        ))}
                    </div>
                  )}
                </section>
                <section className="leader-panel">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">Semangat berprestasi</span>
                      <h2>Papan peringkat</h2>
                    </div>
                    <Icon name="Penghargaan" />
                  </div>
                  <p>
                    {monthLabel(month)} · {certified ? "Disahkan" : "Sementara"}
                  </p>
                  {rows.slice(0, 3).map((r) => (
                    <div className="leader-row" key={r.id}>
                      <span className="rank">{r.rank}</span>
                      <div>
                        <strong>{r.name}</strong>
                        <small>{r.class_name}</small>
                      </div>
                      <b>
                        {r.total}
                        <small> poin</small>
                      </b>
                    </div>
                  ))}
                  {!rows.length && <p>Belum ada anggota pada periode ini.</p>}
                  <button
                    className="secondary full"
                    onClick={() => navigate("Ranking bulanan")}
                  >
                    Lihat ranking lengkap
                  </button>
                  <small className="leader-note">
                    Poin sama, posisi sama. Setiap anggota punya kesempatan
                    untuk berkembang.
                  </small>
                </section>
              </div>
              {admin && (
                <section className="review-strip">
                  <div>
                    <h3>
                      {incomplete
                        ? "Selesaikan catatan latihan"
                        : "Catatan bulan ini sudah lengkap"}
                    </h3>
                    <p>
                      {incomplete
                        ? `${incomplete} catatan absensi atau penilaian perlu dilengkapi sebelum pengesahan.`
                        : "Periksa hasil dan sahkan setelah bulan berakhir."}
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() =>
                      navigate(incomplete ? "Penilaian" : "Ranking bulanan")
                    }
                  >
                    {incomplete ? "Periksa penilaian" : "Periksa hasil bulanan"}
                  </button>
                </section>
              )}
            </>
          )}
          {page === "Profil pelatih" && admin && (
            <TrainerProfile
              data={data}
              onPhotoSave={saveProfilePhoto}
              onProfileSave={saveTrainerProfile}
              navigate={navigate}
              dark={dark}
              toggleTheme={() => setDark(!dark)}
              logout={logout}
            />
          )}
          {page === "Anggota" && (
            <section className="panel">
              <div className="section-heading wrap">
                <div>
                  <h2>
                    Daftar anggota{" "}
                    <span className="count">{s.members.length}</span>
                  </h2>
                  <p>
                    Riwayat anggota tetap tersimpan saat akun dinonaktifkan.
                  </p>
                </div>
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={() =>
                      open({ kind: "import", title: "Impor anggota dari CSV" })
                    }
                  >
                    Impor CSV
                  </button>
                  <button
                    onClick={() =>
                      open({ kind: "member", title: "Tambah anggota" })
                    }
                  >
                    + Tambah anggota
                  </button>
                </div>
              </div>
              <div className="toolbar">
                <input
                  aria-label="Cari anggota"
                  placeholder="Cari nama, NIS, atau kelas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span>{visibleMembers.length} anggota</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Anggota</th>
                      <th>NIS</th>
                      <th>Bergabung</th>
                      <th>Status</th>
                      <th>Kelola</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMembers.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="person">
                            <Avatar
                              className="avatar"
                              name={m.name}
                              src={m.photo_path
                                ? `/api/profile/photo?member=${encodeURIComponent(m.id)}&v=${encodeURIComponent(m.photo_updated_at ?? "current")}`
                                : ""}
                            />
                            <div>
                              <strong>{m.name}</strong>
                              <small>{m.class_name}</small>
                            </div>
                          </div>
                        </td>
                        <td>{m.nis}</td>
                        <td>{dateLabel(m.joined_on)}</td>
                        <td>
                          <Status>{m.active ? "Aktif" : "Nonaktif"}</Status>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="text-button"
                              onClick={() =>
                                open({
                                  kind: "edit-member",
                                  title: "Ubah anggota",
                                  data: m,
                                })
                              }
                            >
                              Ubah
                            </button>
                            <button
                              className="text-button"
                              onClick={() =>
                                open({
                                  kind: "reset",
                                  title: "Atur ulang kata sandi",
                                  data: m.id,
                                })
                              }
                            >
                              Reset sandi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleMembers.length && (
                  <Empty
                    title="Anggota tidak ditemukan"
                    description="Tambahkan anggota atau sesuaikan kata pencarian."
                  />
                )}
              </div>
              <MemberProgressCards
                members={visibleMembers}
                month={month}
                state={s}
              />
            </section>
          )}
          {page === "Latihan & absensi" && (
            <>
              <div className="section-heading">
                <h2>Jadwal & kehadiran</h2>
                <button
                  onClick={() =>
                    open({ kind: "session", title: "Buat latihan" })
                  }
                >
                  + Buat latihan
                </button>
              </div>
              <div className="session-grid">
                {periodSessions.map((t) => (
                  <article
                    className={`panel session-card ${selected?.id === t.id ? "selected" : ""}`}
                    key={t.id}
                  >
                    <div className="section-heading">
                      <Status>{t.status}</Status>
                      <span>{dateLabel(t.date)}</span>
                    </div>
                    <h3>{t.title}</h3>
                    <p>{t.material}</p>
                    <dl>
                      <div>
                        <dt>Lokasi</dt>
                        <dd>{t.location}</dd>
                      </div>
                      <div>
                        <dt>Absensi</dt>
                        <dd>
                          {timeLabel(t.opens_at, s.timezone)} –{" "}
                          {timeLabel(t.closes_at, s.timezone)}
                        </dd>
                      </div>
                      <div>
                        <dt>Metode</dt>
                        <dd>Scan QR · versi {t.version}</dd>
                      </div>
                    </dl>
                    <div className="actions">
                      {t.status === "draf" && (
                        <button
                          disabled={
                            certified || Date.parse(t.closes_at) < Date.now()
                          }
                          onClick={() =>
                            open({
                              kind: "qr",
                              title: "QR absensi latihan",
                              data: t,
                            })
                          }
                        >
                          Generate QR
                        </button>
                      )}
                      <button
                        className="secondary"
                        onClick={() => setSessionId(t.id)}
                      >
                        Lihat absensi
                      </button>
                      {t.status === "draf" && (
                        <button
                          className="text-button"
                          onClick={() =>
                            open({
                              kind: "session",
                              title: "Ubah latihan",
                              data: t,
                            })
                          }
                        >
                          Ubah
                        </button>
                      )}
                      {t.status !== "dibatalkan" && (
                        <button
                          className="text-button"
                          onClick={() =>
                            open({
                              kind: "cancel-session",
                              title: "Batalkan latihan",
                              data: t.id,
                            })
                          }
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!periodSessions.length && (
                <Empty
                  title="Belum ada latihan"
                  description="Tetapkan aturan poin, lalu buat jadwal latihan pertama."
                />
              )}
              {selected && (
                <section className="panel">
                  <div className="section-heading wrap">
                    <div>
                      <h2>Absensi: {selected.title}</h2>
                      <p>
                        {dateLabel(selected.date)} · {selectedAtt.length}{" "}
                        catatan
                      </p>
                    </div>
                    <button className="secondary" onClick={() => refresh()}>
                      Muat ulang absensi
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSessionId(selected.id);
                        open({
                          kind: "correction",
                          title: "Izin, sakit, atau koreksi absensi",
                        });
                      }}
                    >
                      Kelola status
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Anggota</th>
                          <th>Status</th>
                          <th>Waktu diterima</th>
                          <th>Metode / bukti lama</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.members
                          .filter((m) => eligible(m, selected.date))
                          .map((m) => {
                            const a = selectedAtt.find(
                              (a) => a.member_id === m.id,
                            );
                            return (
                              <tr key={m.id}>
                                <td>
                                  {m.name}
                                  <small>{m.class_name}</small>
                                </td>
                                <td>
                                  <Status>{a?.status ?? "belum absen"}</Status>
                                </td>
                                <td>
                                  {a?.qr_checkin || a?.evidence
                                    ? timeLabel(
                                        (a.qr_checkin ?? a.evidence!)
                                          .received_at,
                                        s.timezone,
                                      )
                                    : "Tidak tersedia"}
                                </td>
                                <td>
                                  {a?.qr_checkin ? (
                                    <span className="status">Scan QR</span>
                                  ) : a?.evidence ? (
                                    <button
                                      className="text-button"
                                      onClick={async () => {
                                        try {
                                          const r = await fetch(
                                            "/api/evidence?id=" + a.id,
                                          );
                                          const j = await r.json();
                                          if (!r.ok) throw new Error(j.error);
                                          open({
                                            kind: "evidence",
                                            title: "Bukti absensi",
                                            data: j.url,
                                          });
                                        } catch (e) {
                                          setError(
                                            e instanceof Error
                                              ? e.message
                                              : "Gagal membuka bukti.",
                                          );
                                        }
                                      }}
                                    >
                                      Lihat bukti lama
                                    </button>
                                  ) : (
                                    <small>Belum ada scan QR</small>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
          {page === "Penilaian" && (
            <CriteriaEditor
              key={`${month}-${JSON.stringify(s.rules.find((r) => r.month === month)?.criteria)}`}
              rules={s.rules.find((r) => r.month === month)}
              month={month}
              busy={busy}
              mutate={mutate}
            />
          )}
          {page === "Penilaian" &&
            !!s.rules.find((r) => r.month === month)?.criteria?.length && (
              <CriteriaGrading
                data={data}
                month={month}
                selected={selected}
                setSession={setSessionId}
                busy={busy}
                mutate={mutate}
              />
            )}
          {page === "Penilaian" &&
            !s.rules.find((r) => r.month === month)?.criteria?.length && (
              <section className="panel">
                <div className="section-heading wrap">
                  <div>
                    <h2>Penilaian latihan</h2>
                    <p>
                      Kosong berarti belum dinilai. Nilai nol tetap merupakan
                      penilaian.
                    </p>
                  </div>
                  <Field label="Pilih latihan">
                    <select
                      value={selected?.id ?? ""}
                      onChange={(e) => setSessionId(e.target.value)}
                    >
                      {periodSessions
                        .filter((t) => t.status !== "dibatalkan")
                        .map((t) => (
                          <option value={t.id} key={t.id}>
                            {dateLabel(t.date)} · {t.title}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                {selected && (
                  <p className="inline-note">
                    Batas keaktifan:{" "}
                    {s.rules.find((r) => r.month === selected.date.slice(0, 7))
                      ?.activity ?? "belum diatur"}{" "}
                    · Batas keterampilan:{" "}
                    {s.rules.find((r) => r.month === selected.date.slice(0, 7))
                      ?.skill ?? "belum diatur"}
                    .{" "}
                    {isCertified(s, selected.date.slice(0, 7))
                      ? "Bulan disahkan. Buka kembali untuk mengubah nilai."
                      : ""}
                  </p>
                )}
                <div className="grade-list">
                  {selectedAtt
                    .filter((a) => ["hadir", "terlambat"].includes(a.status))
                    .map((a) => (
                      <form
                        key={a.id + ":" + a.activity + ":" + a.skill}
                        className="grade-row"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const v = formValues(e.currentTarget);
                          await mutate("grade", {
                            ...v,
                            member_id: a.member_id,
                            session_id: a.session_id,
                            activity:
                              v.activity === "" ? null : Number(v.activity),
                            skill: v.skill === "" ? null : Number(v.skill),
                          });
                        }}
                      >
                        <div>
                          <strong>{memberName(a.member_id)}</strong>
                          <small>
                            {a.status} ·{" "}
                            {a.activity === null || a.skill === null
                              ? "Belum lengkap"
                              : "Lengkap"}
                          </small>
                        </div>
                        <Field label="Keaktifan">
                          <input
                            name="activity"
                            type="number"
                            min="0"
                            max={
                              s.rules.find(
                                (r) => r.month === selected?.date.slice(0, 7),
                              )?.activity
                            }
                            defaultValue={a.activity ?? ""}
                            placeholder="Belum dinilai"
                          />
                        </Field>
                        <Field label="Keterampilan">
                          <input
                            name="skill"
                            type="number"
                            min="0"
                            max={
                              s.rules.find(
                                (r) => r.month === selected?.date.slice(0, 7),
                              )?.skill
                            }
                            defaultValue={a.skill ?? ""}
                            placeholder="Belum dinilai"
                          />
                        </Field>
                        <Field label="Catatan">
                          <input
                            name="note"
                            defaultValue={a.note}
                            placeholder="Catatan pelatih"
                          />
                        </Field>
                        {(a.activity !== null || a.skill !== null) && (
                          <Field label="Alasan perubahan">
                            <input
                              name="reason"
                              required
                              minLength={5}
                              placeholder="Alasan koreksi"
                            />
                          </Field>
                        )}
                        <button disabled={busy || certified}>Simpan</button>
                      </form>
                    ))}
                </div>
                {!selectedAtt.some((a) =>
                  ["hadir", "terlambat"].includes(a.status),
                ) && (
                  <Empty
                    title="Belum ada anggota untuk dinilai"
                    description="Penilaian tersedia untuk anggota hadir atau terlambat pada latihan terpilih."
                  />
                )}
              </section>
            )}
          {(page === "Ranking bulanan" || page === "Laporan") && (
            <>
              <section className="period-banner">
                <div>
                  <span className="eyebrow">{monthLabel(month)}</span>
                  <h2>
                    {certified
                      ? "Hasil bulanan disahkan"
                      : "Setiap kehadiran berarti."}
                  </h2>
                  <p>
                    {certified
                      ? "Hasil resmi tersedia dalam riwayat penghargaan."
                      : "Ranking sementara akan diperbarui saat absensi dan penilaian masuk."}
                  </p>
                </div>
                <Status>{certified ? "Disahkan" : "Sementara"}</Status>
              </section>
              <section className="panel">
                <div className="section-heading wrap">
                  <div>
                    <h2>
                      {page === "Laporan" ? "Rekap bulanan" : "Ranking anggota"}
                    </h2>
                    <p>
                      {rows.length} anggota · {activeSessions.length} latihan
                      sah
                    </p>
                  </div>
                  <div className="actions">
                    {page === "Laporan" && (
                      <>
                        <button className="secondary" onClick={exportReport}>
                          Ekspor CSV
                        </button>
                        <button
                          className="secondary"
                          onClick={() => window.print()}
                        >
                          Cetak / PDF
                        </button>
                      </>
                    )}
                    {admin && page === "Ranking bulanan" && (
                      <button
                        onClick={() =>
                          open({
                            kind: certified ? "reopen" : "certify",
                            title: certified
                              ? "Buka kembali hasil bulanan"
                              : "Sahkan hasil bulanan",
                          })
                        }
                      >
                        {certified ? "Buka kembali" : "Sahkan hasil bulanan"}
                      </button>
                    )}
                  </div>
                </div>
                <div className="toolbar">
                  <input
                    aria-label="Cari di ranking"
                    placeholder="Cari nama atau kelas..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <span>Urutan poin tertinggi</span>
                </div>
                {rankingsTable(page === "Laporan")}
                <div className="panel-foot">
                  {page === "Laporan"
                    ? `Dibuat ${new Date().toLocaleString("id-ID")} · H hadir, T terlambat, I izin, S sakit, A alpa.`
                    : "Poin sama memperoleh posisi sama. Peringkat bulanan terpisah dari total sepanjang masa."}
                </div>
              </section>
            </>
          )}
          {page === "Penghargaan" && (
            <>
              <section className="award-intro">
                <Icon name="Penghargaan" />
                <span className="eyebrow">Apresiasi anggota</span>
                <h2>Anggota terbaik bulanan</h2>
                <p>
                  Konsisten hadir, aktif berlatih, dan terus mengembangkan
                  keterampilan.
                </p>
              </section>
              {!completed.length ? (
                <section className="panel">
                  <Empty
                    title="Penghargaan pertama menanti"
                    description="Pelatih mengesahkan penerima setelah bulan berakhir dan seluruh data lengkap. Poin tertinggi yang sama mendapat penghargaan bersama."
                  />
                </section>
              ) : (
                completed.map((result) => (
                  <section
                    className="panel award-result"
                    key={result.month + result.version}
                  >
                    <span className="eyebrow">{monthLabel(result.month)}</span>
                    <h2>
                      {result.winners.length
                        ? result.rows
                            .filter((r) => result.winners.includes(r.id))
                            .map((r) => r.name)
                            .join(" & ")
                        : "Tidak ada penghargaan"}
                    </h2>
                    <p>
                      {result.note ||
                        "Anggota Terbaik Bulan " + monthLabel(result.month)}
                    </p>
                    <small>
                      Disahkan{" "}
                      {new Date(result.certified_at).toLocaleString("id-ID")} ·
                      versi {result.version}
                    </small>
                  </section>
                ))
              )}
              {admin && (
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>Prestasi lomba</h2>
                      <p>Dicatat terpisah dan tidak menambah ranking.</p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() =>
                        open({
                          kind: "achievement",
                          title: "Catat prestasi lomba",
                        })
                      }
                    >
                      + Catat prestasi
                    </button>
                  </div>
                  {s.achievements.map((a) => (
                    <div className="history-row" key={a.id}>
                      <strong>{a.title}</strong>
                      <p>
                        {memberName(a.member_id)} · {dateLabel(a.date)}
                      </p>
                      <small>{a.note}</small>
                    </div>
                  ))}
                  {!s.achievements.length && <p>Belum ada prestasi dicatat.</p>}
                </section>
              )}
            </>
          )}
          {page === "Pengaturan" && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Identitas sekolah</h2>
                    <p>
                      Zona waktu menjadi acuan tanggal latihan dan bulan
                      penilaian.
                    </p>
                  </div>
                </div>
                <form
                  className="settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await mutate("settings", formValues(e.currentTarget));
                  }}
                >
                  <Field label="Nama sekolah / regu">
                    <input name="school" required defaultValue={s.school} />
                  </Field>
                  <Field label="Zona waktu sekolah">
                    <select name="timezone" required defaultValue={s.timezone}>
                      <option value="">Pilih zona waktu</option>
                      <option value="Asia/Jakarta">WIB · Asia/Jakarta</option>
                      <option value="Asia/Makassar">
                        WITA · Asia/Makassar
                      </option>
                      <option value="Asia/Jayapura">WIT · Asia/Jayapura</option>
                    </select>
                  </Field>
                  <button disabled={busy}>Simpan identitas</button>
                </form>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Aturan poin bulanan</h2>
                    <p>
                      Pelatih menentukan besaran poin. Aturan yang sudah
                      digunakan tidak dapat diubah.
                    </p>
                  </div>
                </div>
                <form
                  key={month}
                  className="settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const v = formValues(e.currentTarget);
                    await mutate("rules", {
                      month: v.month,
                      present: Number(v.present),
                      late: Number(v.late),
                      activity: 0,
                      skill: 0,
                      criteria:
                        s.rules.find((r) => r.month === v.month)?.criteria ??
                        referenceCriteria,
                    });
                  }}
                >
                  <Field label="Berlaku untuk bulan">
                    <input
                      name="month"
                      type="month"
                      required
                      defaultValue={month}
                    />
                  </Field>
                  {[
                    ["present", "Poin hadir"],
                    ["late", "Poin terlambat"],
                  ].map(([key, label]) => (
                    <Field label={label} key={key}>
                      <input
                        name={key}
                        type="number"
                        min="0"
                        required
                        defaultValue={
                          s.rules.find((r) => r.month === month)?.[
                            key as "present"
                          ] ?? ""
                        }
                      />
                    </Field>
                  ))}
                  <button disabled={busy}>Simpan aturan poin</button>
                  <p className="inline-note">
                    Nilai latihan memakai skala 0–100 per kriteria. Kelola
                    kriterianya melalui menu Penilaian.
                  </p>
                </form>
                <p className="inline-note">
                  Poin terlambat tidak melebihi poin hadir. Ranking menjumlahkan
                  poin absensi dan nilai seluruh kriteria latihan.
                </p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Periode</th>
                        <th>Hadir</th>
                        <th>Terlambat</th>
                        <th>Skala nilai</th>
                        <th>Kriteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.rules.map((r) => (
                        <tr key={r.month}>
                          <td>{monthLabel(r.month)}</td>
                          <td>{r.present}</td>
                          <td>{r.late}</td>
                          <td>{r.criteria?.length ? "0–100" : "Skala lama"}</td>
                          <td>
                            {r.criteria?.map((c) => c.name).join(", ") ??
                              `Keaktifan (${r.activity}), keterampilan (${r.skill})`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Riwayat perubahan</h2>
                </div>
                {s.audits.length ? (
                  s.audits
                    .slice()
                    .reverse()
                    .slice(0, 50)
                    .map((a) => (
                      <details key={a.id} className="history-row">
                        <summary>
                          {a.action} · {new Date(a.at).toLocaleString("id-ID")}
                        </summary>
                        <p>
                          {a.reason || "Pencatatan awal"} · Pelaku: {a.actor}
                        </p>
                        <pre>
                          {JSON.stringify(
                            { sebelum: a.before, sesudah: a.after },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    ))
                ) : (
                  <p>Belum ada perubahan dicatat.</p>
                )}
              </section>
            </>
          )}
          {page === "Absensi saya" && (
            <MemberAttendance
              data={data}
              month={month}
              onAttend={(t) =>
                open({ kind: "scan-qr", title: "Scan QR absensi", data: t })
              }
            />
          )}
          {page === "Perkembangan saya" && (
            <MemberScores
              data={data}
              month={month}
              navigate={navigate}
              onEvidence={async (id) => {
                try {
                  const response = await fetch("/api/evidence?id=" + id);
                  const result = await response.json();
                  if (!response.ok) throw new Error(result.error);
                  open({
                    kind: "evidence",
                    title: "Bukti absensi saya",
                    data: result.url,
                  });
                } catch (error) {
                  setError(readableError(error));
                }
              }}
            />
          )}
          {(page === "Profil saya" || page === "Profil pelatih") && (
            <footer className="profile-footer">
              <blockquote>
                Satu langkah disiplin,<br />
                seribu langkah menuju prestasi
              </blockquote>
              <div className="page-art dashboard-art" aria-hidden="true">
                <img src="/logo-dashboard.png" alt="" width="640" height="640" draggable={false} />
              </div>
            </footer>
          )}
        </main>
      </div>
      {!admin && (
        <nav className="member-bottom-nav" aria-label="Navigasi anggota">
          {memberNavigation.map(({ page: p, label }) => (
            <button
              key={p}
              aria-label={p}
              aria-current={page === p ? "page" : undefined}
              className={page === p ? "active" : ""}
              onClick={() => navigate(p)}
            >
              <MemberIcon name={p} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      {admin && (
        <nav className="member-bottom-nav" aria-label="Navigasi pelatih">
          {trainerNavigation.map(({ page: p, label, icon }) => (
            <button
              key={p}
              aria-label={p}
              aria-current={page === p ? "page" : undefined}
              className={page === p ? "active" : ""}
              onClick={() => navigate(p)}
            >
              <MemberIcon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">{modal?.title}</h2>
          <button
            className="icon-button"
            onClick={() => setModal(null)}
            aria-label="Tutup dialog"
          >
            ×
          </button>
        </div>
        {modal?.kind === "qr" ? (
          <TrainingQr session={modal.data as Training} timezone={s.timezone} />
        ) : modal?.kind === "scan-qr" ? (
          <QrScanner
            session={modal.data as Training}
            timezone={s.timezone}
            onScan={(token) => scanQr(token, modal.data as Training)}
            onDone={() => {
              setModal(null);
              setNotice("Absensi berhasil tercatat.");
              refresh();
            }}
          />
        ) : modal?.kind === "evidence" ? (
          <img
            className="evidence-image"
            src={modal.data as string}
            alt="Bukti absensi dengan waktu server dan koordinat"
          />
        ) : (
          <form onSubmit={submitModal}>
            {modal?.kind === "member" && (
              <div className="form-grid">
                <Field label="Nama lengkap">
                  <input name="name" required minLength={2} />
                </Field>
                <Field label="Nomor induk">
                  <input name="nis" required />
                </Field>
                <Field label="Kelas">
                  <input
                    name="class_name"
                    required
                    placeholder="Contoh: X TKJ 1"
                  />
                </Field>
                <Field label="Tanggal bergabung">
                  <input name="joined_on" type="date" required />
                </Field>
                <Field label="Email akun">
                  <input name="email" type="email" required />
                </Field>
                <Field label="Kata sandi awal">
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                  <small>Minimal 10 karakter. Sampaikan secara pribadi.</small>
                </Field>
              </div>
            )}
            {modal?.kind === "edit-member" && (
              <>
                <Field label="Nama lengkap">
                  <input
                    name="name"
                    required
                    defaultValue={(modal.data as Member).name}
                  />
                </Field>
                <Field label="Kelas">
                  <input
                    name="class_name"
                    required
                    defaultValue={(modal.data as Member).class_name}
                  />
                </Field>
                <Field label="Status akun">
                  <select
                    name="active"
                    defaultValue={String((modal.data as Member).active)}
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </Field>
                <Field label="Alasan perubahan">
                  <textarea name="reason" required minLength={5} />
                </Field>
              </>
            )}
            {modal?.kind === "import" && (
              <>
                <p>
                  Kolom wajib: nis, name, class_name, email, joined_on,
                  password. Tanggal menggunakan YYYY-MM-DD. Maksimal 200 anggota
                  per impor.
                </p>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    download(
                      "template-anggota.csv",
                      toCSV([
                        [
                          "nis",
                          "name",
                          "class_name",
                          "email",
                          "joined_on",
                          "password",
                        ],
                      ]),
                    )
                  }
                >
                  Unduh template CSV
                </button>
                <Field label="Berkas CSV">
                  <input
                    name="csv"
                    type="file"
                    accept=".csv,text/csv"
                    required
                  />
                </Field>
                <p className="small">
                  Baris valid disimpan; baris gagal ditampilkan agar dapat
                  diperbaiki. Unggah ulang hanya baris yang gagal.
                </p>
              </>
            )}
            {modal?.kind === "session" && (
              <div className="form-grid">
                <Field label="Nama latihan">
                  <input
                    name="title"
                    required
                    minLength={3}
                    defaultValue={(modal.data as Training)?.title}
                  />
                </Field>
                <Field label="Tanggal latihan">
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={(modal.data as Training)?.date}
                  />
                </Field>
                <Field label="Lokasi">
                  <input
                    name="location"
                    required
                    defaultValue={(modal.data as Training)?.location}
                  />
                </Field>
                {[
                  ["opens_at", "Buka absensi"],
                  ["on_time_until", "Batas tepat waktu"],
                  ["closes_at", "Tutup absensi"],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={`${label} (${s.timezone || "atur zona waktu"})`}
                  >
                    <input
                      name={key}
                      type="time"
                      required
                      defaultValue={
                        modal.data
                          ? new Date(
                              (modal.data as Training)[key as "opens_at"],
                            ).toLocaleTimeString("en-GB", {
                              timeZone: s.timezone || "Asia/Jakarta",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""
                      }
                    />
                  </Field>
                ))}
                <Field label="Materi latihan">
                  <textarea
                    name="material"
                    required
                    defaultValue={(modal.data as Training)?.material}
                  />
                </Field>
                {modal.data && (
                  <Field label="Alasan perubahan">
                    <textarea name="reason" required minLength={5} />
                  </Field>
                )}
              </div>
            )}
            {modal?.kind === "correction" && (
              <>
                <p>
                  Kehadiran hanya dapat dikoreksi menjadi hadir atau terlambat
                  jika bukti asli yang valid sudah tersedia.
                </p>
                <Field label="Anggota">
                  <select name="member_id" required>
                    {s.members
                      .filter((m) => selected && eligible(m, selected.date))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select name="status">
                    <option value="izin">Izin</option>
                    <option value="sakit">Sakit</option>
                    <option value="alpa">Alpa</option>
                    <option value="hadir">
                      Hadir (scan QR / bukti lama wajib)
                    </option>
                    <option value="terlambat">
                      Terlambat (scan QR / bukti lama wajib)
                    </option>
                  </select>
                </Field>
                <Field label="Alasan">
                  <textarea name="reason" required minLength={5} />
                </Field>
              </>
            )}
            {modal &&
              ["certify", "reopen", "cancel-session"].includes(modal.kind) && (
                <>
                  <p>
                    {modal.kind === "certify"
                      ? `Pengesahan ${monthLabel(month)} hanya dapat dilakukan setelah bulan berakhir dan data lengkap. Jika tidak ada poin positif, bulan ditutup tanpa penghargaan.`
                      : modal.kind === "reopen"
                        ? "Hasil kembali menunggu pengesahan. Versi hasil dan pemenang sebelumnya tetap disimpan."
                        : "Latihan yang dibatalkan tetap memiliki riwayat dan tidak menyumbang poin."}
                  </p>
                  <Field
                    label={
                      modal.kind === "certify"
                        ? "Catatan pengesahan (wajib jika tanpa pemenang)"
                        : "Alasan wajib"
                    }
                  >
                    <textarea
                      name="reason"
                      required={modal.kind !== "certify"}
                      minLength={5}
                    />
                  </Field>
                </>
              )}
            {modal?.kind === "reset" && (
              <Field label="Kata sandi baru">
                <input
                  type="password"
                  name="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                />
              </Field>
            )}
            {modal?.kind === "achievement" && (
              <>
                <Field label="Anggota">
                  <select name="member_id" required>
                    {s.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Prestasi / kegiatan">
                  <input name="title" required minLength={2} />
                </Field>
                <Field label="Tanggal">
                  <input name="date" type="date" required />
                </Field>
                <Field label="Keterangan">
                  <textarea name="note" />
                </Field>
              </>
            )}
            {modalError && (
              <p className="notice error" role="alert">
                {modalError}
              </p>
            )}
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(null)}
              >
                Tutup
              </button>
              <button disabled={busy}>
                {busy
                  ? "Menyimpan..."
                  : modal?.kind === "import"
                    ? "Impor anggota"
                    : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
