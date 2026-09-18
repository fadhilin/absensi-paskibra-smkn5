import { createHmac, timingSafeEqual } from "node:crypto";
import { qrClaimsSchema, type QrClaims } from "./qr-attendance";
const PREFIX = "PASKIBRA-QR:";
function secret() {
  const value = process.env.ATTENDANCE_TOKEN_SECRET;
  if (!value || value.length < 32)
    throw new Error("ATTENDANCE_TOKEN_SECRET minimal 32 karakter.");
  return value;
}
export function issueQrToken(claims: QrClaims) {
  const payload = Buffer.from(
    JSON.stringify(qrClaimsSchema.parse(claims)),
  ).toString("base64url");
  return (
    PREFIX +
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function verifyQrToken(token: string, now: number): QrClaims {
  if (token.length > 2000 || !token.startsWith(PREFIX))
    throw new Error("QR bukan kode absensi Paskibra yang valid.");
  const parts = token.slice(PREFIX.length).split(".");
  if (parts.length !== 2 || !parts.every((v) => /^[A-Za-z0-9_-]+$/.test(v)))
    throw new Error("QR tidak valid.");
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new Error("QR tidak valid atau telah diubah.");
  let claims: QrClaims;
  try {
    claims = qrClaimsSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString()),
    );
  } catch {
    throw new Error("Isi QR tidak valid.");
  }
  if (claims.expires < now) throw new Error("QR sudah kedaluwarsa.");
  return claims;
}
