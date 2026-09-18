import { authenticate, errorResponse, readState, service } from "@/lib/server";
export async function GET(request: Request) {
  try {
    const viewer = await authenticate();
    const { state } = await readState();
    const a = state.attendance.find(
      (a) => a.id === new URL(request.url).searchParams.get("id"),
    );
    if (!a?.evidence || (viewer.role !== "admin" && viewer.id !== a.member_id))
      throw new Error("Bukti tidak tersedia.");
    const { data, error } = await service()
      .storage.from("attendance")
      .createSignedUrl(a.evidence.path, 60);
    if (error) throw new Error("Bukti gagal dimuat.");
    return Response.json(
      { url: data.signedUrl },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
