"use client";

import { useMemo, useState } from "react";
import { assessmentRanking, schoolDate } from "@/lib/engine";
import { toCSV } from "@/lib/csv";
import type { AssessmentReport, DashboardData } from "@/lib/types";

type Preset = "7 hari" | "14 hari" | "30 hari" | "1 bulan" | "3 bulan" | "6 bulan" | "Atur tanggal";
type Mutation = (action: string, input: unknown) => Promise<boolean>;

function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function shiftMonth(date: string, months: number) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function monthEnd(date: string) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1, 0);
  return value.toISOString().slice(0, 10);
}

function weekStart(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftDay(date, -((day + 6) % 7));
}

function presetRange(preset: Preset, today: string) {
  const monday = weekStart(today);
  const sunday = shiftDay(monday, 6);
  if (preset === "7 hari") return { start: monday, end: sunday };
  if (preset === "14 hari") return { start: shiftDay(monday, -7), end: sunday };
  if (preset === "30 hari") return { start: shiftDay(sunday, -29), end: sunday };
  if (preset === "1 bulan")
    return { start: `${today.slice(0, 7)}-01`, end: monthEnd(today) };
  const months = preset === "3 bulan" ? 3 : 6;
  return { start: shiftMonth(`${today.slice(0, 7)}-01`, 1 - months), end: monthEnd(today) };
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function reportForRange(reports: AssessmentReport[], start: string, end: string) {
  return reports
    .filter((report) => report.start === start && report.end === end)
    .at(-1);
}

export function AssessmentReportView({
  data,
  mutate,
}: {
  data: DashboardData;
  mutate: Mutation;
}) {
  const today = schoolDate(new Date(), data.state.timezone);
  const initial = presetRange("7 hari", today);
  const [preset, setPreset] = useState<Preset>("7 hari");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [busy, setBusy] = useState(false);
  const reports = data.state.assessment_reports ?? [];
  const report = reportForRange(reports, start, end);
  const preview = useMemo(
    () => assessmentRanking(data.state, start, end),
    [data.state, start, end],
  );
  const rows = report?.rows ?? preview;
  const allGraded = Boolean(
    report && rows.length && rows.every((row) => row.grade !== null),
  );
  const complete = preview.every((row) => row.incomplete === 0);
  const ended = end < today;

  function setPresetRange(value: Preset) {
    setPreset(value);
    if (value !== "Atur tanggal") {
      const range = presetRange(value, today);
      setStart(range.start < "2026-01-01" ? "2026-01-01" : range.start);
      setEnd(range.end);
    }
  }

  async function certify() {
    setBusy(true);
    await mutate("report-certify", { start, end });
    setBusy(false);
  }

  async function grade(memberId: string, value: string) {
    setBusy(true);
    await mutate("report-grade", {
      start,
      end,
      member_id: memberId,
      grade: value || null,
    });
    setBusy(false);
  }

  function downloadReport() {
    if (!report || !allGraded) return;
    const csv = toCSV([
      ["Laporan Penilaian"],
      ["Periode", `${dateLabel(start)} - ${dateLabel(end)}`],
      ["Disahkan", new Date(report.certified_at).toLocaleString("id-ID")],
      ["No.", "NIS", "Nama", "Jurusan", "Kehadiran H/T/I/S/A", "Total poin", "Predikat"],
      ...rows.map((row, index) => [
        index + 1,
        row.nis,
        row.name,
        row.class_name,
        `${row.hadir}/${row.terlambat}/${row.izin}/${row.sakit}/${row.alpa}`,
        row.total,
        row.grade,
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `laporan-penilaian-${start}-${end}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <section className="panel report-period-controls">
        <div className="section-heading">
          <div>
            <h2>Atur periode laporan</h2>
            <p>Pilih periode tetap atau tentukan tanggal mulai dan akhir.</p>
          </div>
        </div>
        <label className="field">
          <span>Periode</span>
          <select value={preset} onChange={(event) => setPresetRange(event.target.value as Preset)}>
            {["7 hari", "14 hari", "30 hari", "1 bulan", "3 bulan", "6 bulan", "Atur tanggal"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <div className="report-date-fields">
          <label className="field">
            <span>Tanggal mulai</span>
            <input
              type="date"
              required
              min="2026-01-01"
              max={end}
              value={start}
              onChange={(event) => {
                if (event.target.value) {
                  setPreset("Atur tanggal");
                  setStart(event.target.value);
                }
              }}
            />
          </label>
          <label className="field">
            <span>Tanggal akhir</span>
            <input
              type="date"
              required
              min={start < "2026-01-01" ? "2026-01-01" : start}
              value={end}
              onChange={(event) => {
                if (event.target.value) {
                  setPreset("Atur tanggal");
                  setEnd(event.target.value);
                }
              }}
            />
          </label>
        </div>
        <p className="inline-note">{dateLabel(start)} sampai {dateLabel(end)}. Tanggal awal laporan tersedia mulai 1 Januari 2026.</p>
      </section>

      <section className="panel assessment-report-panel">
        <div className="section-heading wrap">
          <div>
            <h2>Laporan Penilaian</h2>
            <p>{rows.length} anggota · {dateLabel(start)} - {dateLabel(end)}</p>
          </div>
          <div className="actions">
            {report ? (
              <>
                <span className="status good">Ranking disahkan</span>
                <button disabled={!allGraded} onClick={downloadReport}>Unduh laporan CSV</button>
                <button className="secondary" disabled={!allGraded} onClick={() => window.print()}>Cetak / PDF</button>
              </>
            ) : (
              <button disabled={busy || !ended || !rows.length || !complete} onClick={certify}>
                {busy ? "Menyimpan..." : "Sahkan ranking periode ini"}
              </button>
            )}
          </div>
        </div>
        {!report && (
          <p className="inline-note">
            {!ended
              ? "Pengesahan tersedia setelah tanggal akhir periode lewat."
              : !rows.length
                ? "Belum ada latihan pada periode ini."
                : !complete
                  ? "Lengkapi semua absensi dan nilai latihan sebelum mengesahkan ranking."
                  : "Setelah ranking disahkan, isi predikat tiap anggota sebelum mengunduh laporan."}
          </p>
        )}
        {report && (
          <p className="inline-note">
            {allGraded
              ? `Ranking disahkan ${new Date(report.certified_at).toLocaleString("id-ID")}. Laporan siap diunduh.`
              : "Isi predikat setiap anggota untuk membuka unduhan laporan."}
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>NIS</th>
                <th>Nama</th>
                <th>Jurusan</th>
                <th>Kehadiran H/T/I/S/A</th>
                <th className="right">Total poin</th>
                <th>Predikat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>{row.nis}</td>
                  <td>{row.name}</td>
                  <td>{row.class_name}</td>
                  <td>{row.hadir}/{row.terlambat}/{row.izin}/{row.sakit}/{row.alpa}</td>
                  <td className="right points">{row.total}</td>
                  <td>
                    {report ? (
                      <select
                        aria-label={`Predikat ${row.name}`}
                        value={row.grade ?? ""}
                        disabled={busy}
                        onChange={(event) => void grade(row.id, event.target.value)}
                      >
                        <option value="">Pilih</option>
                        {["A", "B", "C", "D"].map((value) => <option key={value}>{value}</option>)}
                      </select>
                    ) : "Menunggu pengesahan"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="empty">Tidak ada anggota dengan sesi latihan pada periode ini.</p>}
        </div>
      </section>
    </>
  );
}
