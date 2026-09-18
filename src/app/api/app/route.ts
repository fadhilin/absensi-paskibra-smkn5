import { z } from "zod";
import { applyAction, publicView } from "@/lib/engine";
import {
  authenticate,
  configured,
  errorResponse,
  sameOrigin,
  service,
  transact,
} from "@/lib/server";
import { Ranking } from "@/lib/types";
import { trainerDirectory } from "@/lib/trainer-profile";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!configured())
      return Response.json(
        { configured: false },
        { headers: { "Cache-Control": "no-store" } },
      );
    const viewer = await authenticate();
    const month = z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .parse(new URL(request.url).searchParams.get("month"));
    const state = await transact((s) => s);
    const { data: profiles, error: profileError } = await service()
      .from("profiles")
      .select("id,name,role,active")
      .eq("role", "admin")
      .eq("active", true);
    if (profileError)
      throw new Error("Informasi pelatih gagal dibaca. Coba muat ulang.");
    const { data: ranks, error } = await service().rpc("monthly_ranking", {
      payload: state,
      period: month,
    });
    if (error)
      throw new Error(
        "Ranking gagal dihitung. Pastikan seluruh migrasi sampai 004 sudah dijalankan.",
      );
    if ((ranks as Ranking[]).some((row) => row.evaluation === undefined))
      throw new Error(
        "Jalankan migrasi 004 agar ranking memakai seluruh kriteria penilaian.",
      );
    const safeRanks =
      viewer.role === "admin"
        ? ranks
        : (ranks as Ranking[]).map((r) => ({
            id: r.id,
            name: r.name,
            class_name: r.class_name,
            total: r.total,
            rank: r.rank,
          }));
    return Response.json(
      {
        ...publicView(state, viewer, month),
        ranking: safeRanks,
        viewer,
        configured: true,
        trainers: trainerDirectory(state, profiles ?? []),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    await sameOrigin();
    const viewer = await authenticate();
    const { action, data } = z
      .object({ action: z.string(), data: z.unknown() })
      .parse(await request.json());
    await transact((s) => applyAction(s, viewer, action, data));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
