"use client";

import { useRef, useState, type FormEvent } from "react";
import type { Announcement, Competency, DashboardData } from "@/lib/types";
import { schoolDate } from "@/lib/engine";
import { MemberIcon } from "./member-view";

type Props = {
  data: DashboardData;
  busy: boolean;
  mutate(action: string, input: unknown): Promise<boolean>;
};
const levels = {
  perlu_latihan: "Perlu latihan",
  berkembang: "Berkembang",
  menguasai: "Menguasai",
};
const publication = {
  draft: "Draf",
  published: "Terbit",
  archived: "Diarsipkan",
};
function dateLabel(value: string) {
  return new Date(
    value.includes("T") ? value : value + "T12:00:00Z",
  ).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function Announcements({ data, busy, mutate }: Props) {
  const admin = data.viewer.role === "admin";
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const items = [...(data.state.announcements ?? [])]
    .filter((a) => admin || a.status === "published")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  function edit(a: Announcement | null) {
    setEditing(a);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    if (
      await mutate("announcement", {
        ...input,
        ...(editing ? { id: editing.id } : {}),
      })
    ) {
      setEditing(null);
      setFormOpen(false);
    }
  }
  return (
    <section className="learning-section">
      <div className="section-heading">
        <div>
          <h2>Pengumuman</h2>
          <p>Informasi terbaru dari pelatih.</p>
        </div>
        {admin && !formOpen && (
          <button onClick={() => edit(null)}>Buat pengumuman</button>
        )}
      </div>
      {admin && formOpen && (
        <form
          ref={formRef}
          key={editing?.id ?? "new"}
          className="panel learning-form"
          onSubmit={save}
        >
          <h3>{editing ? "Ubah pengumuman" : "Pengumuman baru"}</h3>
          <label className="field">
            <span>Judul pengumuman</span>
            <input
              name="title"
              required
              minLength={3}
              maxLength={160}
              defaultValue={editing?.title}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Isi pengumuman</span>
            <textarea
              name="body"
              required
              minLength={5}
              maxLength={5000}
              defaultValue={editing?.body}
              rows={5}
            />
          </label>
          <label className="field">
            <span>Status publikasi</span>
            <select name="status" defaultValue={editing?.status ?? "draft"}>
              <option value="draft">Draf</option>
              <option value="published">Terbit untuk semua anggota</option>
              <option value="archived">Diarsipkan</option>
            </select>
          </label>
          {editing && (
            <label className="field">
              <span>Alasan perubahan</span>
              <input name="reason" required minLength={5} maxLength={1000} />
            </label>
          )}
          <p>
            Hanya pengumuman berstatus terbit yang tampil pada akun anggota.
          </p>
          <div className="actions">
            <button disabled={busy}>Simpan pengumuman</button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
      {items.length ? (
        items.map((a) => (
          <article key={a.id} className="panel announcement-card">
            <div className="section-heading">
              <span className="learning-icon">
                <MemberIcon name="Pengumuman" />
              </span>
              <small>{dateLabel(a.published_at ?? a.updated_at)}</small>
              {admin && <span className="status">{publication[a.status]}</span>}
            </div>
            <h3>{a.title}</h3>
            <p className="announcement-body">{a.body}</p>
            {admin && (
              <button className="secondary" onClick={() => edit(a)}>
                Ubah pengumuman
              </button>
            )}
          </article>
        ))
      ) : (
        <div className="panel empty">
          <MemberIcon name="Pengumuman" />
          <h3>Belum ada pengumuman</h3>
          <p>
            {admin
              ? "Buat informasi pertama untuk anggota."
              : "Informasi dari pelatih akan tampil di sini."}
          </p>
        </div>
      )}
    </section>
  );
}

export function Competencies({ data, busy, mutate }: Props) {
  const admin = data.viewer.role === "admin";
  const [editing, setEditing] = useState<Competency | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const members = data.state.members.filter((m) => m.active);
  const memberId = admin
    ? selectedMember || members[0]?.id || ""
    : data.viewer.id;
  const items = (data.state.competencies ?? []).filter(
    (c) => admin || c.active,
  );
  function edit(c: Competency | null) {
    setEditing(c);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    if (
      await mutate("competency", {
        ...input,
        active: input.active === "true",
        ...(editing ? { id: editing.id } : {}),
      })
    ) {
      setEditing(null);
      setFormOpen(false);
    }
  }
  return (
    <section className="learning-section">
      <div className="section-heading">
        <div>
          <h2>{admin ? "Kompetensi anggota" : "Kompetensi saya"}</h2>
          <p>Perkembangan keterampilan berdasarkan penilaian pelatih.</p>
        </div>
        {admin && !formOpen && (
          <button onClick={() => edit(null)}>Tambah kompetensi</button>
        )}
      </div>
      {admin && formOpen && (
        <form
          key={editing?.id ?? "new"}
          className="panel learning-form"
          onSubmit={save}
        >
          <h3>{editing ? "Ubah kompetensi" : "Kompetensi baru"}</h3>
          <label className="field">
            <span>Nama kompetensi</span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={120}
              defaultValue={editing?.title}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Deskripsi kompetensi</span>
            <textarea
              name="description"
              maxLength={1000}
              defaultValue={editing?.description}
            />
          </label>
          <label className="field">
            <span>Status kompetensi</span>
            <select
              name="active"
              defaultValue={editing?.active === false ? "false" : "true"}
            >
              <option value="true">Aktif</option>
              <option value="false">Nonaktif</option>
            </select>
          </label>
          {editing && (
            <label className="field">
              <span>Alasan perubahan</span>
              <input name="reason" required minLength={5} maxLength={1000} />
            </label>
          )}
          <div className="actions">
            <button disabled={busy}>Simpan kompetensi</button>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              Batal
            </button>
          </div>
        </form>
      )}
      <p className="inline-note">
        Kompetensi tidak menambah poin ranking. Riwayat perubahan penilaian
        dicatat untuk pelatih.
      </p>
      {admin && (
        <label className="field competency-member">
          <span>Anggota yang dinilai</span>
          <select
            value={memberId}
            onChange={(event) => setSelectedMember(event.target.value)}
          >
            {!members.length && (
              <option value="">Belum ada anggota aktif</option>
            )}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.class_name}
              </option>
            ))}
          </select>
        </label>
      )}
      {items.length ? (
        items.map((c) => {
          const assessment = data.state.competency_assessments?.find(
            (a) => a.competency_id === c.id && a.member_id === memberId,
          );
          return (
            <article key={c.id} className="panel competency-card">
              <div className="section-heading">
                <span className="learning-icon">
                  <MemberIcon name="Kompetensi" />
                </span>
                <span
                  className={`status ${assessment?.level === "menguasai" ? "good" : ""}`}
                >
                  {!c.active
                    ? "Nonaktif"
                    : assessment
                      ? levels[assessment.level]
                      : "Belum dinilai"}
                </span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.description || "Pelatih belum menambahkan deskripsi."}</p>
              {admin && (
                <button className="text-button" onClick={() => edit(c)}>
                  Ubah kompetensi
                </button>
              )}
              {admin && memberId && c.active ? (
                <form
                  key={`${memberId}-${assessment?.updated_at ?? "new"}`}
                  className="learning-form assessment-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    await mutate("competency_assessment", {
                      ...Object.fromEntries(new FormData(event.currentTarget)),
                      member_id: memberId,
                      competency_id: c.id,
                    });
                  }}
                >
                  <label className="field">
                    <span>Tingkat penguasaan</span>
                    <select
                      name="level"
                      defaultValue={assessment?.level ?? ""}
                      required
                    >
                      <option value="" disabled>
                        Pilih hasil penilaian
                      </option>
                      {Object.entries(levels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Tanggal penilaian</span>
                    <input
                      type="date"
                      name="assessed_on"
                      required
                      max={schoolDate(new Date(), data.state.timezone)}
                      defaultValue={
                        assessment?.assessed_on ??
                        schoolDate(new Date(), data.state.timezone)
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Catatan kompetensi</span>
                    <textarea
                      name="note"
                      maxLength={1000}
                      defaultValue={assessment?.note}
                    />
                  </label>
                  {assessment && (
                    <label className="field">
                      <span>Alasan perubahan penilaian</span>
                      <input
                        name="reason"
                        required
                        minLength={5}
                        maxLength={1000}
                      />
                    </label>
                  )}
                  <button disabled={busy}>Simpan penilaian kompetensi</button>
                </form>
              ) : (
                assessment && (
                  <div className="competency-note">
                    <small>Dinilai {dateLabel(assessment.assessed_on)}</small>
                    <h4>Catatan pelatih</h4>
                    <p>{assessment.note || "Belum ada catatan tambahan."}</p>
                  </div>
                )
              )}
              {!admin && !assessment && (
                <p className="inline-note">
                  Pelatih belum mencatat penilaian untuk kompetensi ini.
                </p>
              )}
            </article>
          );
        })
      ) : (
        <div className="panel empty">
          <MemberIcon name="Kompetensi" />
          <h3>Belum ada kompetensi</h3>
          <p>
            {admin
              ? "Tambahkan keterampilan yang akan dinilai."
              : "Daftar keterampilan akan tampil setelah dibuat pelatih."}
          </p>
        </div>
      )}
    </section>
  );
}
