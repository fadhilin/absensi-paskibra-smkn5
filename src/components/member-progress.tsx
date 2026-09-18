import type { CSSProperties } from "react";
import { memberProgress } from "@/lib/member-progress";
import type { Member, State } from "@/lib/types";
import { Avatar } from "./profile-photo";

type Metric = {
  label: string;
  percentage: number | null;
  detail: string;
  pending?: string;
};

function ProgressDonut({ metric }: { metric: Metric }) {
  const unavailable = metric.percentage === null;
  return (
    <div className="member-progress-metric">
      <div
        className="member-progress-donut"
        role="img"
        aria-label={
          unavailable
            ? `${metric.label}: belum ada data`
            : `${metric.label}: ${metric.percentage} persen, ${metric.detail}`
        }
        style={{ "--progress": `${metric.percentage ?? 0}%` } as CSSProperties}
      >
        <strong>{unavailable ? "–" : `${metric.percentage}%`}</strong>
      </div>
      <div>
        <h4>{metric.label}</h4>
        <p>{metric.detail}</p>
        {metric.pending && <small>{metric.pending}</small>}
      </div>
    </div>
  );
}

export function MemberProgressCards({
  members,
  month,
  state,
}: {
  members: Member[];
  month: string;
  state: State;
}) {
  if (!members.length) return null;
  return (
    <section className="member-progress-section" aria-labelledby="member-progress-heading">
      <div className="member-progress-heading">
        <div>
          <h3 id="member-progress-heading">Perkembangan anggota</h3>
          <p>Ringkasan {new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`))}.</p>
        </div>
        <span>Hadir · Nilai · Poin</span>
      </div>
      <div className="member-progress-list">
        {members.map((member) => {
          const progress = memberProgress(state, member.id, month);
          const photo = member.photo_path
            ? `/api/profile/photo?member=${encodeURIComponent(member.id)}&v=${encodeURIComponent(member.photo_updated_at ?? "current")}`
            : "";
          return (
            <article className="member-progress-card" key={member.id}>
              <div className="member-progress-person">
                <Avatar className="avatar" name={member.name} src={photo} />
                <div>
                  <h4>{member.name}</h4>
                  <p>{member.class_name} · {member.nis}</p>
                </div>
              </div>
              <div className="member-progress-metrics">
                <ProgressDonut
                  metric={{
                    label: "Hadir",
                    percentage: progress.attendance.percentage,
                    detail: `${progress.attendance.current} dari ${progress.attendance.maximum} sesi`,
                  }}
                />
                <ProgressDonut
                  metric={{
                    label: "Nilai",
                    percentage: progress.score.percentage,
                    detail: `${progress.score.current} dari ${progress.score.maximum} nilai`,
                    pending: progress.score.missing
                      ? `${progress.score.missing} komponen belum dinilai`
                      : undefined,
                  }}
                />
                <div className="member-progress-points">
                  <h4>Total poin</h4>
                  <strong>{progress.points.current}</strong>
                  <p>{progress.points.current ? "Poin terkumpul" : "Belum ada poin"}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
