import { State } from "../../src/lib/types";
import { referenceCriteria } from "../../src/lib/scoring";
export function demoState(): State {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const period = `${year}-${month}`;
  const names = [
    "Aditya Pratama",
    "Nadia Putri",
    "Raka Saputra",
    "Salsabila Zahra",
    "Fajar Ramadhan",
    "Dinda Maharani",
    "Bagas Setiawan",
    "Aulia Rahma",
  ];
  const members = names.map((name, i) => ({
    id: `demo-${i + 1}`,
    name,
    nis: `260${String(i + 1).padStart(3, "0")}`,
    class_name: `${i % 3 === 0 ? "XI" : "X"} ${["TKJ 1", "AKL 2", "RPL 1"][i % 3]}`,
    email: `anggota${i + 1}@example.test`,
    joined_on: `${year}-01-01`,
    left_on: null,
    active: true,
  }));
  const sessions: State["sessions"] = [3, 7, 10].map((day, i) => ({
    id: `s-${i}`,
    title: [
      "Latihan dasar baris-berbaris",
      "Formasi & kekompakan regu",
      "Evaluasi pengibaran bendera",
    ][i],
    material: [
      "Sikap sempurna, hadap kanan, dan langkah tegap.",
      "Latihan perubahan formasi dan kerja sama regu.",
      "Teknik pengibaran, pelipatan bendera, dan evaluasi.",
    ][i],
    date: `${period}-${String(day).padStart(2, "0")}`,
    location: "Lapangan sekolah (contoh)",
    opens_at: `${period}-${String(day).padStart(2, "0")}T07:00:00+07:00`,
    on_time_until: `${period}-${String(day).padStart(2, "0")}T07:30:00+07:00`,
    closes_at: `${period}-${String(day).padStart(2, "0")}T09:00:00+07:00`,
    status: "selesai",
    version: 1,
  }));
  const today = `${period}-${String(now.getDate()).padStart(2, "0")}`;
  sessions.push({
    ...sessions[0],
    id: "s-next",
    title: "Latihan rutin Paskibra",
    material: "Pemantapan PBB dan persiapan petugas upacara.",
    date: today,
    opens_at: `${today}T00:00:00+07:00`,
    on_time_until: `${today}T23:00:00+07:00`,
    closes_at: `${today}T23:59:59+07:00`,
    status: "draf",
  });
  const attendance: State["attendance"] = sessions.slice(0, 3).flatMap((t, j) =>
    members.map((m, i) => ({
      id: `a-${j}-${i}`,
      member_id: m.id,
      session_id: t.id,
      status:
        i === 6 && j === 1
          ? "izin"
          : i === 4 && j === 2
            ? "sakit"
            : i % 3 === 0
              ? "terlambat"
              : "hadir",
      activity: j === 2 && i < 3 ? null : ((i + j) % 3) + 3,
      skill: j === 2 && i < 3 ? null : ((i + j + 1) % 3) + 3,
      note: "",
      scores: Object.fromEntries(
        referenceCriteria.map((c, index) => [
          c.id,
          j === 2 && i < 3 ? null : 75 + ((i * 3 + j + index * 2) % 21),
        ]),
      ),
    })),
  );
  return {
    school: "Paskibra • Sekolah contoh",
    timezone: "Asia/Jakarta",
    members,
    sessions,
    attendance,
    rules: [
      {
        month: period,
        present: 10,
        late: 7,
        activity: 0,
        skill: 0,
        criteria: structuredClone(referenceCriteria),
      },
    ],
    results: [],
    audits: [],
    achievements: [],
    announcements: [
      {
        id: "announcement-demo",
        title: "Persiapan latihan rutin",
        body: "Contoh pengumuman: siapkan perlengkapan latihan dan periksa jadwal sebelum berangkat. Informasi ini hanya untuk mencoba tampilan aplikasi.",
        status: "published",
        published_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ],
    competencies: [
      {
        id: "competency-pbb",
        title: "PBB",
        description:
          "Ketepatan sikap, aba-aba, dan gerakan dasar baris-berbaris.",
        active: true,
      },
      {
        id: "competency-team",
        title: "Kekompakan regu",
        description: "Keselarasan gerakan dan kerja sama dalam formasi.",
        active: true,
      },
    ],
    competency_assessments: [
      {
        id: "assessment-demo",
        member_id: "demo-1",
        competency_id: "competency-pbb",
        level: "berkembang",
        note: "Contoh catatan: pertahankan sikap dan latih ketepatan langkah.",
        assessed_on: today,
        updated_at: now.toISOString(),
      },
    ],
  };
}
