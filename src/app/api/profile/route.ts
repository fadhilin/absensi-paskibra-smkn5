import {
  authenticate,
  sameOrigin,
  transact,
  errorResponse,
} from "@/lib/server";
import { updateTrainerProfile } from "@/lib/trainer-profile";

export async function POST(request: Request) {
  try {
    await sameOrigin();
    const viewer = await authenticate();
    if (viewer.role !== "admin")
      throw new Error("Hanya pelatih dapat mengubah profil pelatih.");
    const input = await request.json();
    await transact((state) => updateTrainerProfile(state, viewer, input));
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
