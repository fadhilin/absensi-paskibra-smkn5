"use client";
import { useId, useState } from "react";
import type {
  Attendance,
  DashboardData,
  Member,
  Rules,
  Training,
} from "@/lib/types";
import { evaluation, referenceCriteria } from "@/lib/scoring";
import { isCertified } from "@/lib/engine";

type Mutation = (action: string, input: unknown) => Promise<boolean>;
export function CriteriaEditor({
  rules,
  month,
  busy,
  mutate,
}: {
  rules?: Rules;
  month: string;
  busy: boolean;
  mutate: Mutation;
}) {
  const [criteria, setCriteria] = useState(() =>
    structuredClone(rules?.criteria ?? referenceCriteria),
  );
  return (
    <details className="panel criteria-editor">
      <summary>Ketentuan penilaian · skala 0–100</summary>
      <p>
        Setiap kriteria berbobot sama dengan nilai maksimum 100. Akumulasi nilai
        masuk ke ranking bersama poin absensi. Kriteria baru membuat penilaian
        sebelumnya belum lengkap sampai nilainya diisi.
      </p>
      {!rules ? (
        <p className="inline-note">
          Tetapkan poin absensi bulan {month} di Pengaturan terlebih dahulu.
        </p>
      ) : (
        <form
          className="learning-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const input = Object.fromEntries(new FormData(event.currentTarget));
            await mutate("scoring_criteria", {
              month,
              criteria,
              reason: input.reason ?? "",
            });
          }}
        >
          {criteria.map((c, i) => (
            <div className="criteria-edit-row" key={c.id}>
              <label className="field">
                <span>Kriteria {i + 1}</span>
                <input
                  value={c.name}
                  onChange={(event) =>
                    setCriteria(
                      criteria.map((item) =>
                        item.id === c.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
              <button
                className="secondary"
                type="button"
                aria-label={`Hapus kriteria ${i + 1}`}
                disabled={criteria.length === 1}
                onClick={() =>
                  setCriteria(criteria.filter((item) => item.id !== c.id))
                }
              >
                Hapus
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            disabled={criteria.length >= 20}
            onClick={() =>
              setCriteria([...criteria, { id: crypto.randomUUID(), name: "" }])
            }
          >
            Tambah kriteria
          </button>
          {!!rules.criteria?.length && (
            <label className="field">
              <span>Alasan perubahan kriteria</span>
              <input name="reason" required minLength={5} maxLength={1000} />
            </label>
          )}
          <button disabled={busy}>Simpan ketentuan penilaian</button>
        </form>
      )}
    </details>
  );
}

export function CriteriaGrading({
  data,
  month,
  selected,
  setSession,
  busy,
  mutate,
}: {
  data: DashboardData;
  month: string;
  selected?: Training;
  setSession(id: string): void;
  busy: boolean;
  mutate: Mutation;
}) {
  const rules = data.state.rules.find((r) => r.month === month);
  const [query, setQuery] = useState("");
  const records = data.state.attendance.filter(
    (a) =>
      a.session_id === selected?.id &&
      ["hadir", "terlambat"].includes(a.status),
  );
  const matches = (memberId: string) => {
    const member = data.state.members.find((m) => m.id === memberId);
    return (
      member &&
      `${member.name} ${member.nis} ${member.class_name}`
        .toLocaleLowerCase("id")
        .includes(query.trim().toLocaleLowerCase("id"))
    );
  };
  const found = records.filter((a) => matches(a.member_id)).length;
  return (
    <section className="panel">
      <div className="section-heading wrap">
        <div>
          <h2>Penilaian latihan</h2>
          <p>
            Geser bar untuk memberi nilai 0–100. Kosong berarti belum dinilai.
          </p>
        </div>
        <label className="field">
          <span>Pilih latihan</span>
          <select
            value={selected?.id ?? ""}
            onChange={(event) => setSession(event.target.value)}
          >
            {data.state.sessions
              .filter(
                (t) => t.date.startsWith(month) && t.status !== "dibatalkan",
              )
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.date} · {t.title}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="field grading-search">
        <span>Cari anggota untuk dinilai</span>
        <input
          type="search"
          placeholder="Nama, NIS, atau kelas"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="grading-result-count" aria-live="polite">
        {found} dari {records.length} anggota pada latihan ini
      </p>
      {isCertified(data.state, month) && (
        <p className="inline-note">
          Bulan sudah disahkan. Buka kembali sebelum mengubah nilai.
        </p>
      )}
      {rules &&
        records.map((a) => (
          <GradeCard
            key={`${a.id}-${JSON.stringify(a.scores)}-${JSON.stringify(rules.criteria)}`}
            record={a}
            member={data.state.members.find((m) => m.id === a.member_id)!}
            rules={rules}
            hidden={!matches(a.member_id)}
            disabled={busy || isCertified(data.state, month)}
            mutate={mutate}
          />
        ))}
      {!!records.length && !found && (
        <div className="empty">
          <h3>Anggota tidak ditemukan</h3>
          <p>Coba nama, NIS, atau kelas lain pada latihan ini.</p>
          <button className="secondary" onClick={() => setQuery("")}>
            Hapus pencarian
          </button>
        </div>
      )}
      {!records.length && (
        <div className="empty">
          <h3>Belum ada anggota untuk dinilai</h3>
          <p>Penilaian tersedia setelah kehadiran anggota tercatat.</p>
        </div>
      )}
    </section>
  );
}

function GradeCard({
  record,
  member,
  rules,
  hidden,
  disabled,
  mutate,
}: {
  record: Attendance;
  member: Member;
  rules: Rules;
  hidden: boolean;
  disabled: boolean;
  mutate: Mutation;
}) {
  const id = useId();
  const [note, setNote] = useState(record.note);
  const [scores, setScores] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(
      (rules.criteria ?? []).map((c) => [c.id, record.scores?.[c.id] ?? null]),
    ),
  );
  const score = evaluation({ ...record, scores }, rules);
  const dirty =
    note !== record.note ||
    (rules.criteria ?? []).some(
      (c) => scores[c.id] !== (record.scores?.[c.id] ?? null),
    );
  const setScore = (key: string, value: number | null) =>
    setScores((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      className="criteria-grade-card"
      hidden={hidden}
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await mutate("grade", {
          member_id: record.member_id,
          session_id: record.session_id,
          scores,
          note,
          reason: form.get("reason") ?? "",
        });
      }}
    >
      <div className="section-heading">
        <div>
          <h3>{member.name}</h3>
          <small>
            NIS {member.nis} · {member.class_name}
          </small>
          <small>
            {record.status} · {score.complete ? "Lengkap" : "Belum lengkap"}
          </small>
        </div>
        <strong>
          {score.total} / {score.max}
        </strong>
      </div>
      {dirty && <p className="grade-draft-note">Perubahan belum disimpan.</p>}
      <fieldset className="grade-fields" disabled={disabled}>
        <legend className="sr-only">Nilai {member.name}</legend>
        {(rules.criteria ?? []).map((c) => (
          <div className="score-slider-field" key={c.id}>
            <div className="score-slider-heading">
              <label htmlFor={`${id}-${c.id}`}>{c.name}</label>
              <input
                type="number"
                aria-label={`Nilai ${c.name}`}
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                placeholder="-"
                value={scores[c.id] ?? ""}
                onChange={(event) =>
                  setScore(
                    c.id,
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
              />
            </div>
            <input
              id={`${id}-${c.id}`}
              className="score-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={scores[c.id] ?? 0}
              aria-valuetext={
                scores[c.id] === null
                  ? "Belum dinilai"
                  : `${scores[c.id]} dari 100`
              }
              onChange={(event) => setScore(c.id, Number(event.target.value))}
              onPointerDown={() => {
                if (scores[c.id] === null) setScore(c.id, 0);
              }}
              onKeyDown={(event) => {
                if (
                  scores[c.id] === null &&
                  [
                    "Home",
                    "End",
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "PageUp",
                    "PageDown",
                  ].includes(event.key)
                )
                  setScore(c.id, 0);
              }}
            />
            <div className="score-slider-scale">
              <span>0</span>
              <span>
                {scores[c.id] === null
                  ? "Belum dinilai"
                  : `${scores[c.id]} / 100`}
              </span>
              <span>100</span>
            </div>
            <button
              className="text-button"
              type="button"
              disabled={scores[c.id] === null}
              aria-label={`Kosongkan ${c.name}`}
              onClick={() => setScore(c.id, null)}
            >
              Kosongkan
            </button>
          </div>
        ))}
        <label className="field">
          <span>Catatan pelatih</span>
          <textarea
            name="note"
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {evaluation(record, rules).assessed > 0 && (
          <label className="field">
            <span>Alasan perubahan</span>
            <input name="reason" required minLength={5} maxLength={1000} />
          </label>
        )}
        <button type="submit">Simpan nilai</button>
      </fieldset>
    </form>
  );
}
