"use client";

import { useState } from "react";
import { trainerAttendance } from "@/lib/trainer-attendance";
import type { State } from "@/lib/types";
import { MemberIcon } from "./member-view";

export function TrainerAttendance({ state, onMembers, onSession }: {
  state: State;
  onMembers(): void;
  onSession(id: string, date: string): void;
}) {
  const [selected, setSelected] = useState("");
  const summary = trainerAttendance(state, selected);
  const { session } = summary;
  const date = new Date(`${summary.today}T12:00:00Z`).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const time = (value: string) => new Date(value).toLocaleTimeString("id-ID", {
    timeZone: state.timezone || "Asia/Jakarta", hour: "2-digit", minute: "2-digit",
  });
  return (
    <section className="trainer-attendance" aria-label="Ringkasan latihan hari ini">
      <div className="trainer-today">
        <MemberIcon name="Jadwal latihan" />
        <div>
          <h2>Latihan hari ini</h2>
          <p>{date}</p>
          {session ? (
            <>
              <strong>{session.title}</strong>
              <small>{time(session.opens_at)} – {time(session.closes_at)} · {summary.closed ? "Ditutup" : summary.started ? "Absensi dibuka" : "Belum dibuka"}</small>
            </>
          ) : <strong>Belum ada latihan hari ini.</strong>}
        </div>
      </div>
      {summary.sessions.length > 1 && (
        <label className="field trainer-session-picker">
          <span>Pilih latihan hari ini</span>
          <select value={session?.id ?? ""} onChange={(event) => setSelected(event.target.value)}>
            {summary.sessions.map((item) => (
              <option key={item.id} value={item.id}>{time(item.opens_at)} · {item.title}</option>
            ))}
          </select>
        </label>
      )}
      <div className="trainer-attendance-grid">
        <button className="trainer-stat total" onClick={onMembers}>
          <MemberIcon name="Anggota" />
          <span><strong>{summary.activeMembers}</strong><span>Total anggota</span><small>Anggota aktif</small></span>
        </button>
        <div className="trainer-stat present">
          <MemberIcon name="Absensi saya" />
          <span><strong>{session ? summary.present : "–"}</strong><span>Hadir</span><small>Termasuk terlambat</small></span>
        </div>
        <div className="trainer-stat excused">
          <MemberIcon name="Laporan" />
          <span><strong>{session ? summary.excused : "–"}</strong><span>Izin</span><small>Termasuk sakit</small></span>
        </div>
        <div className={`trainer-stat ${summary.closed ? "absent" : "pending"}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            {summary.closed ? <path d="m8 8 8 8m0-8-8 8" /> : <path d="M12 6v6l4 2" />}
          </svg>
          <span><strong>{session ? summary.absent : "–"}</strong><span>{summary.closed ? "Alpa" : "Belum absen"}</span><small>{summary.closed ? "Tanpa keterangan" : "Menunggu absensi"}</small></span>
        </div>
      </div>
      {session && (
        <button className="secondary full" onClick={() => onSession(session.id, session.date)}>
          Lihat absensi lengkap
        </button>
      )}
    </section>
  );
}
