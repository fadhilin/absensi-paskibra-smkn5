"use client";
import { useState, type CSSProperties } from "react";
import type { DashboardData } from "@/lib/types";
import { attendanceTotal, evaluation, evaluationSummary } from "@/lib/scoring";
import { MemberScoreTrend, type MemberPage } from "./member-view";

export function ScoreDonut({
  data,
  month,
}: {
  data: DashboardData;
  month: string;
}) {
  const score = evaluationSummary(data.state, data.viewer.id, month);
  return (
    <div className="score-donut-summary">
      <div
        className="score-donut"
        role="img"
        aria-label={
          score.percentage === null
            ? "Belum ada nilai"
            : `Total nilai ${score.percentage} persen${score.missing ? ", sementara" : ""}`
        }
        style={{ "--progress": `${score.percentage ?? 0}%` } as CSSProperties}
      >
        <strong>
          {score.percentage === null ? "Belum ada" : `${score.percentage}%`}
        </strong>
      </div>
      <div>
        <h2>Total nilai</h2>
        <strong>
          {score.total} / {score.max}
        </strong>
        <p>
          {score.missing
            ? `Sementara · ${score.missing} komponen belum dinilai`
            : score.assessed
              ? "Semua komponen sudah dinilai"
              : "Menunggu penilaian pelatih"}
        </p>
      </div>
    </div>
  );
}
export function MemberScores({
  data,
  month,
  navigate,
  onEvidence,
}: {
  data: DashboardData;
  month: string;
  navigate(page: MemberPage): void;
  onEvidence(id: string): void;
}) {
  const [tab, setTab] = useState<"nilai" | "grafik">("nilai");
  const summary = evaluationSummary(data.state, data.viewer.id, month);
  const records = [...summary.records].sort((a, b) =>
    (
      data.state.sessions.find((t) => t.id === b.session_id)?.date ?? ""
    ).localeCompare(
      data.state.sessions.find((t) => t.id === a.session_id)?.date ?? "",
    ),
  );
  return (
    <section className="member-scores">
      <div className="member-tabs" role="group" aria-label="Tampilan nilai">
        <button aria-pressed={tab === "nilai"} onClick={() => setTab("nilai")}>
          Nilai
        </button>
        <button
          aria-pressed={tab === "grafik"}
          onClick={() => setTab("grafik")}
        >
          Grafik
        </button>
        <button onClick={() => navigate("Kompetensi")}>Kompetensi</button>
      </div>
      {tab === "grafik" ? (
        <>
          <section className="panel">
            <ScoreDonut data={data} month={month} />
            <p className="score-formula">
              Semangat Kejar Poinnya!!!
            </p>
          </section>
          <section className="panel">
            <MemberScoreTrend data={data} month={month} />
          </section>
        </>
      ) : (
        <>
          <h2 className="score-detail-title">Rincian latihan saya</h2>
          {summary.rules &&
            records.map((a) => {
              const t = data.state.sessions.find((t) => t.id === a.session_id)!;
              const score = evaluation(a, summary.rules!);
              const points = attendanceTotal(a, summary.rules!);
              const attendancePoints = points.total - score.total;
              const checkedInAt = a.qr_checkin?.received_at ?? a.evidence?.received_at;
              return (
                <article className="panel score-detail-card" key={a.id}>
                  <div className="section-heading">
                    <div>
                      <h3>{t.title}</h3>
                      <small>
                        {new Date(t.date + "T12:00:00Z").toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      </small>
                    </div>
                    <span className="status">
                      {score.complete ? "Lengkap" : "Belum lengkap"}
                    </span>
                  </div>
                  <dl className="score-attendance-list">
                    <div>
                      <dt>Kehadiran</dt>
                      <dd>{a.status === "hadir" ? "Hadir" : "Terlambat"}</dd>
                    </div>
                    {checkedInAt && (
                      <div>
                        <dt>Jam absensi</dt>
                        <dd>
                          {new Date(checkedInAt).toLocaleTimeString("id-ID", {
                            timeZone: "Asia/Jakarta",
                            hour: "2-digit",
                            minute: "2-digit",
                          })} WIB
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt>Poin absensi</dt>
                      <dd><strong>{attendancePoints}</strong> poin</dd>
                    </div>
                  </dl>
                  <h4>Rincian penilaian</h4>
                  <dl className="score-detail-list">
                    {score.components.map((c) => (
                      <div key={c.id}>
                        <dt>{c.name}</dt>
                        <dd>
                          {c.value === null ? (
                            <span className="ungraded">Belum dinilai</span>
                          ) : (
                            <>
                              <strong>{c.value}</strong>
                              <small> / {c.max}</small>
                            </>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <dl className="score-points-list">
                    <div>
                      <dt>Subtotal penilaian</dt>
                      <dd>{score.total} poin</dd>
                    </div>
                    <div className="score-session-total">
                      <dt>Total poin latihan</dt>
                      <dd><strong>{points.total}</strong> poin</dd>
                    </div>
                  </dl>
                  <p className="score-formula">
                    {attendancePoints} poin absensi + {score.total} poin penilaian.
                    {!score.complete && " Total sementara; masih ada komponen yang belum dinilai."}
                  </p>
                  <div className="coach-note">
                    <h4>Catatan pelatih</h4>
                    <p>{a.note || "Belum ada catatan."}</p>
                  </div>
                  {a.evidence && (
                    <button
                      className="text-button"
                      onClick={() => onEvidence(a.id)}
                    >
                      Lihat bukti absensi saya
                    </button>
                  )}
                </article>
              );
            })}
          {!records.length && (
            <div className="panel empty">
              <h3>Belum ada riwayat latihan</h3>
              <p>
                Nilai akan tampil setelah Anda mengikuti latihan dan pelatih
                mencatat penilaian.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
