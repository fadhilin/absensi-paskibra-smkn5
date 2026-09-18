import { z } from "zod";
import QRCode from "qrcode";
import {
  authenticate,
  errorResponse,
  readState,
  sameOrigin,
  transact,
} from "@/lib/server";
import { qrSession, recordQrAttendance } from "@/lib/qr-attendance";
import { issueQrToken, verifyQrToken } from "@/lib/qr-token";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await authenticate();
    const sessionId = z
      .string()
      .min(1)
      .max(100)
      .parse(new URL(request.url).searchParams.get("session"));
    const { state } = await readState();
    const session = qrSession(state, viewer, sessionId);
    const token = issueQrToken({
      purpose: "attendance-qr-v1",
      session: session.id,
      version: session.version,
      expires: Date.parse(session.closes_at),
    });
    const image = await QRCode.toDataURL(token, {
      width: 720,
      margin: 4,
      errorCorrectionLevel: "M",
    });
    return Response.json(
      { image, closes_at: session.closes_at },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  const receivedAt = new Date();
  try {
    await sameOrigin();
    const viewer = await authenticate();
    if (viewer.role !== "member")
      throw new Error("Absensi QR hanya untuk anggota.");
    if (Number(request.headers.get("content-length") ?? 0) > 4096)
      throw new Error("Permintaan QR terlalu besar.");
    const { token, session_id } = z
      .object({
        token: z.string().min(1).max(2000),
        session_id: z.string().min(1).max(100),
      })
      .parse(await request.json());
    const claims = verifyQrToken(token, receivedAt.getTime());
    if (claims.session !== session_id)
      throw new Error("QR bukan untuk latihan yang dipilih.");
    const state = await transact(
      (s) => recordQrAttendance(s, viewer, claims, receivedAt),
      receivedAt,
    );
    const attendance = state.attendance.find(
      (a) => a.member_id === viewer.id && a.session_id === claims.session,
    )!;
    return Response.json(
      {
        ok: true,
        name: state.members.find((m) => m.id === viewer.id)!.name,
        attendance,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
