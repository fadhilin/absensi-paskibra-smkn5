import { cookies } from "next/headers";
import { z } from "zod";
import { REMEMBER_COOKIE } from "@/lib/session-cookies";
import {
  authClient,
  errorResponse,
  readState,
  sameOrigin,
  service,
  setSession,
} from "@/lib/server";

export async function POST(request: Request) {
  try {
    await sameOrigin();
    const { email, password, remember } = z
      .object({
        email: z.email(),
        password: z.string().min(1).max(128),
        remember: z.boolean().default(false),
      })
      .parse(await request.json());
    service();
    const { data, error } = await authClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session)
      throw new Error("Email atau kata sandi tidak sesuai.");
    const { data: profile } = await service()
      .from("profiles")
      .select("active,role")
      .eq("id", data.user.id)
      .single();
    if (!profile?.active) throw new Error("Akun belum diaktifkan pelatih.");
    if (profile.role === "member") {
      const { state } = await readState();
      if (
        !state.members.some(
          (member) => member.id === data.user.id && member.active,
        )
      ) {
        throw new Error("Keanggotaan tidak aktif. Hubungi pelatih.");
      }
    }
    await setSession(data.session, remember);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE() {
  try {
    await sameOrigin();
    const jar = await cookies();
    jar.delete("paskibra-access");
    jar.delete("paskibra-refresh");
    jar.delete(REMEMBER_COOKIE);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
