import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { closeExpired } from "./engine";
import { State, Viewer } from "./types";
import { REMEMBER_COOKIE, sessionCookieOptions } from "./session-cookies";

export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.ATTENDANCE_TOKEN_SECRET,
  );
export function service() {
  if (!configured())
    throw new Error(
      "Supabase belum dihubungkan. Lengkapi .env.local sesuai README.",
    );
  if (process.env.ATTENDANCE_TOKEN_SECRET!.length < 32)
    throw new Error("ATTENDANCE_TOKEN_SECRET harus minimal 32 karakter.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function authClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function authenticate(): Promise<Viewer> {
  const jar = await cookies();
  const token = jar.get("paskibra-access")?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  const db = service();
  let {
    data: { user },
  } = await db.auth.getUser(token);
  if (!user) {
    const refresh = jar.get("paskibra-refresh")?.value;
    if (!refresh) throw new Error("UNAUTHORIZED");
    const result = await authClient().auth.refreshSession({
      refresh_token: refresh,
    });
    if (!result.data.session || !result.data.user)
      throw new Error("UNAUTHORIZED");
    await setSession(result.data.session);
    user = result.data.user;
  }
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile?.active) throw new Error("UNAUTHORIZED");
  if (profile.role === "member") {
    const { state } = await readState();
    const member = state.members.find((m) => m.id === user.id);
    if (!member?.active) throw new Error("UNAUTHORIZED");
    profile.name = member.name;
  } else {
    const { state } = await readState();
    profile.name =
      state.trainers?.find((p) => p.id === user.id)?.name ?? profile.name;
  }
  return { id: user.id, name: profile.name, role: profile.role };
}
export async function setSession(
  session: {
    access_token: string;
    refresh_token: string;
  },
  remember?: boolean,
) {
  const jar = await cookies();
  const persistent = remember ?? jar.get(REMEMBER_COOKIE)?.value === "1";
  const options = sessionCookieOptions(
    persistent,
    process.env.NODE_ENV === "production",
  );
  jar.set("paskibra-access", session.access_token, options);
  jar.set("paskibra-refresh", session.refresh_token, options);
  jar.set(REMEMBER_COOKIE, persistent ? "1" : "0", options);
}
export async function sameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin || new URL(origin).host !== host)
    throw new Error("Asal permintaan tidak valid.");
}
export async function readState(): Promise<{ state: State; revision: number }> {
  const { data, error } = await service()
    .from("school_state")
    .select("data,revision")
    .eq("id", true)
    .single();
  if (error || !data)
    throw new Error("Database belum siap atau gagal dibaca. Jalankan migrasi.");
  return { state: data.data as State, revision: data.revision };
}
export async function transact(
  change: (s: State) => State | Promise<State>,
  now = new Date(),
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { state, revision } = await readState();
    closeExpired(state, now);
    const next = await change(state);
    const { data, error } = await service().rpc("commit_school_state", {
      expected_revision: revision,
      new_data: next,
    });
    if (error) throw new Error("Penyimpanan gagal. Silakan coba lagi.");
    if (data) return next;
  }
  throw new Error("Data sedang diperbarui pengguna lain. Silakan coba lagi.");
}
export function errorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Permintaan gagal. Silakan coba lagi.";
  if (message === "UNAUTHORIZED")
    return Response.json(
      { error: "Sesi berakhir atau akun tidak aktif. Masuk kembali." },
      { status: 401 },
    );
  // Zod issues contain field constraints, never echo the submitted payload.
  if (error && typeof error === "object" && "issues" in error)
    return Response.json(
      {
        error: (error as { issues: { message: string }[] }).issues
          .map((i) => i.message)
          .join(" "),
      },
      { status: 400 },
    );
  return Response.json({ error: message }, { status: 400 });
}
