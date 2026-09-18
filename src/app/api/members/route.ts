import { z } from "zod";
import { memberSchema } from "@/lib/domain";
import { isCertified, schoolDate } from "@/lib/engine";
import {
  authenticate,
  errorResponse,
  readState,
  sameOrigin,
  service,
  transact,
} from "@/lib/server";

export async function POST(request: Request) {
  try {
    await sameOrigin();
    const viewer = await authenticate();
    if (viewer.role !== "admin")
      throw new Error("Hanya pelatih dapat mengelola akun.");
    const body = await request.json();
    const db = service();
    if (body.action === "reset-password") {
      const { id, password } = z
        .object({
          id: z.string().uuid(),
          password: z.string().min(10).max(128),
        })
        .parse(body);
      const { data: target } = await db
        .from("profiles")
        .select("role")
        .eq("id", id)
        .single();
      if (target?.role !== "member")
        throw new Error("Akun anggota tidak ditemukan.");
      const { error } = await db.auth.admin.updateUserById(id, { password });
      if (error) throw new Error("Kata sandi gagal diubah.");
      await transact((s) => {
        s.audits.push({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          actor: viewer.id,
          action: "Reset kata sandi",
          reason: "Bantuan akun oleh pelatih",
          before: null,
          after: { member_id: id },
        });
        return s;
      });
      return Response.json({ ok: true });
    }
    const rows = z.array(z.unknown()).min(1).max(200).parse(body.rows);
    const results: { row: number; ok: boolean; error?: string }[] = [];
    for (const [i, raw] of rows.entries()) {
      let createdId: string | undefined;
      try {
        const m = memberSchema.parse(raw);
        // Auth is external to the state transaction; compensate failed state commits.
        const { data, error } = await db.auth.admin.createUser({
          email: m.email,
          password: m.password,
          email_confirm: true,
        });
        if (error || !data.user)
          throw new Error(
            "Akun gagal dibuat. Periksa email yang mungkin sudah digunakan.",
          );
        createdId = data.user.id;
        const { error: profileError } = await db
          .from("profiles")
          .insert({
            id: createdId,
            name: m.name,
            role: "member",
            active: true,
          });
        if (profileError) throw new Error("Profil gagal disimpan.");
        const id = createdId;
        await transact((s) => {
          if (
            s.members.some((x) => x.nis.toLowerCase() === m.nis.toLowerCase())
          )
            throw new Error("Nomor induk sudah digunakan.");
          if (m.joined_on > schoolDate(new Date(), s.timezone))
            throw new Error("Tanggal bergabung tidak boleh di masa depan.");
          if (
            s.results.some(
              (r) =>
                isCertified(s, r.month) && r.month >= m.joined_on.slice(0, 7),
            )
          )
            throw new Error(
              "Buka kembali bulan historis yang terdampak sebelum menambahkan anggota dengan tanggal bergabung ini.",
            );
          const { password: _password, ...fields } = m;
          const member = { ...fields, id, active: true, left_on: null };
          s.members.push(member);
          s.audits.push({
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actor: viewer.id,
            action: "Tambah anggota",
            reason: "Pembuatan akun",
            before: null,
            after: member,
          });
          return s;
        });
        results.push({ row: i + 2, ok: true });
      } catch (e) {
        if (createdId) {
          try {
            const { state } = await readState();
            if (!state.members.some((m) => m.id === createdId)) {
              await db.from("profiles").delete().eq("id", createdId);
              await db.auth.admin.deleteUser(createdId);
            }
          } catch {
            /* Preserve accounts until commit outcome can be reconciled. */
          }
        }
        results.push({
          row: i + 2,
          ok: false,
          error:
            e instanceof z.ZodError
              ? e.issues
                  .map((i) => i.path.join(".") + ": " + i.message)
                  .join("; ")
              : e instanceof Error
                ? e.message
                : "Gagal menyimpan.",
        });
      }
    }
    return Response.json({ results });
  } catch (e) {
    return errorResponse(e);
  }
}
