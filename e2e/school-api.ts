import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import QRCode from "qrcode";
import { demoState } from "../tests/fixtures/school";
import { applyAction, publicView } from "../src/lib/engine";
import { memberSchema } from "../src/lib/domain";
import { qrSession, recordQrAttendance } from "../src/lib/qr-attendance";
import { issueQrToken, verifyQrToken } from "../src/lib/qr-token";
import {
  ownPhotoProfile,
  trainerDirectory,
  updateTrainerProfile,
} from "../src/lib/trainer-profile";
import type { State, Viewer } from "../src/lib/types";

const schools = new WeakMap<Page, { state: State; viewer: Viewer | null }>();
const coach: Viewer = { id: "coach-test", name: "Pelatih Uji", role: "admin" };
const member: Viewer = { id: "demo-1", name: "Aditya Pratama", role: "member" };
export async function useSchoolApi(
  page: Page,
  role: "admin" | "member" = "admin",
) {
  const school = {
    state: demoState(),
    viewer: (role === "admin" ? coach : member) as Viewer | null,
  };
  schools.set(page, school);
  process.env.ATTENDANCE_TOKEN_SECRET =
    "qr-test-secret-only-not-for-production-0001";
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    try {
      if (url.pathname === "/api/auth" && request.method() === "DELETE") {
        school.viewer = null;
        return route.fulfill({ json: { ok: true } });
      }
      if (!school.viewer)
        return route.fulfill({
          status: 401,
          json: { error: "Masuk kembali." },
        });
      const viewer = {
        ...school.viewer,
        name:
          school.state.trainers?.find((p) => p.id === school.viewer!.id)
            ?.name ?? school.viewer.name,
      };
      if (url.pathname === "/api/app") {
        if (request.method() === "POST") {
          const { action, data } = request.postDataJSON();
          school.state = applyAction(school.state, viewer, action, data);
          return route.fulfill({ json: { ok: true } });
        }
        return route.fulfill({
          json: {
            ...publicView(school.state, viewer, url.searchParams.get("month")!),
            viewer,
            configured: true,
            trainers: trainerDirectory(school.state, [
              { ...coach, active: true },
            ]),
          },
        });
      }
      if (url.pathname === "/api/profile") {
        school.state = updateTrainerProfile(
          school.state,
          viewer,
          request.postDataJSON(),
        );
        return route.fulfill({ json: { ok: true } });
      }
      if (url.pathname === "/api/profile/photo") {
        const target = url.searchParams.get("trainer");
        const memberTarget = url.searchParams.get("member");
        if (memberTarget && viewer.role !== "admin")
          return route.fulfill({ status: 403, json: { error: "Hanya pelatih." } });
        const profile = memberTarget
          ? school.state.members.find((m) => m.id === memberTarget)
          : target
          ? school.state.trainers?.find((p) => p.id === target)
          : ownPhotoProfile(school.state, viewer);
        if (request.method() === "GET") {
          if (!profile?.photo_path)
            return route.fulfill({
              status: 404,
              json: { error: "Foto belum tersedia." },
            });
          return route.fulfill({
            contentType: "image/png",
            body: readFileSync("public/icons/icon-192.png"),
          });
        }
        const own = ownPhotoProfile(school.state, viewer);
        if (request.method() === "DELETE") delete own.photo_path;
        else own.photo_path = `${viewer.id}/photo.jpg`;
        own.photo_updated_at = new Date().toISOString();
        return route.fulfill({ json: { ok: true } });
      }
      if (url.pathname === "/api/attendance") {
        if (request.method() === "GET") {
          const session = qrSession(
            school.state,
            viewer,
            url.searchParams.get("session")!,
          );
          const token = issueQrToken({
            purpose: "attendance-qr-v1",
            session: session.id,
            version: session.version,
            expires: Date.parse(session.closes_at),
          });
          return route.fulfill({
            json: {
              image: await QRCode.toDataURL(token, { width: 720, margin: 4 }),
              closes_at: session.closes_at,
            },
          });
        }
        const { token, session_id } = request.postDataJSON();
        const claims = verifyQrToken(token, Date.now());
        if (claims.session !== session_id)
          throw new Error("QR bukan untuk latihan yang dipilih.");
        school.state = recordQrAttendance(school.state, viewer, claims);
        return route.fulfill({
          json: {
            ok: true,
            name: viewer.name,
            attendance: school.state.attendance.find(
              (a) => a.member_id === viewer.id && a.session_id === session_id,
            ),
          },
        });
      }
      if (url.pathname === "/api/members") {
        const input = request.postDataJSON();
        if (input.action === "reset-password")
          return route.fulfill({ json: { ok: true } });
        const results = input.rows.map((raw: unknown, i: number) => {
          try {
            const { password: _, ...value } = memberSchema.parse(raw);
            if (
              school.state.members.some(
                (m) =>
                  m.nis.toLowerCase() === value.nis.toLowerCase() ||
                  m.email.toLowerCase() === value.email.toLowerCase(),
              )
            )
              throw new Error("NIS atau email sudah digunakan.");
            school.state.members.push({
              ...value,
              id: crypto.randomUUID(),
              active: true,
              left_on: null,
            });
            return { ok: true, row: i + 2 };
          } catch (error) {
            return {
              ok: false,
              row: i + 2,
              error: error instanceof Error ? error.message : "Gagal",
            };
          }
        });
        return route.fulfill({ json: { results } });
      }
      return route.fulfill({
        status: 404,
        json: { error: "Endpoint uji tidak ditemukan." },
      });
    } catch (error) {
      return route.fulfill({
        status: 400,
        json: { error: error instanceof Error ? error.message : "Gagal" },
      });
    }
  });
}
export async function switchRole(page: Page, role: "admin" | "member") {
  const school = schools.get(page);
  if (!school) throw new Error("Pasang API uji terlebih dahulu.");
  school.viewer = role === "admin" ? coach : member;
  await page.reload();
  await page.locator(".app-shell").waitFor();
}
