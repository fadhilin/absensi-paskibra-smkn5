import { expect, test } from "@playwright/test";
import { demoState } from "../tests/fixtures/school";
import { publicView } from "../src/lib/engine";
import type { Training } from "../src/lib/types";

test("beranda pelatih merangkum sesi hari ini pada HP", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-09-18T02:00:00Z"));
  const state = demoState();
  state.members[7].active = false;
  state.members[7].left_on = "2026-09-01";
  const today: Training = {
    ...state.sessions[0], id: "today", date: "2026-09-18", title: "Latihan pagi",
    opens_at: "2026-09-18T08:00:00+07:00", closes_at: "2026-09-18T10:00:00+07:00",
    status: "draf",
  };
  state.sessions = [today, { ...today, id: "later", title: "Latihan sore", opens_at: "2026-09-18T15:00:00+07:00", closes_at: "2026-09-18T17:00:00+07:00" }];
  state.attendance = (["hadir", "terlambat", "izin", "sakit"] as const).map((status, index) => ({
    id: `record-${index}`, member_id: state.members[index].id, session_id: "today", status,
    activity: null, skill: null, note: "",
  }));
  const viewer = { id: "coach-test", name: "Pelatih Uji", role: "admin" as const };
  await page.route("**/api/app?*", (route) => route.fulfill({ json: {
    ...publicView(state, viewer, new URL(route.request().url()).searchParams.get("month")!),
    viewer, configured: true, trainers: [],
  } }));
  await page.goto("/");
  const overview = page.getByRole("region", { name: "Ringkasan latihan hari ini" });
  await expect(overview.locator(".total strong")).toHaveText("7");
  await expect(overview.locator(".present strong")).toHaveText("2");
  await expect(overview.locator(".excused strong")).toHaveText("2");
  await expect(overview.locator(".pending strong")).toHaveText("3");
  await expect(overview).toContainText("Belum absen");
  await expect(overview.locator(".trainer-stat")).toHaveCount(4);
  await expect(page.locator(".agenda-row h3")).toHaveText(["Latihan sore", "Latihan pagi"]);
  await page.screenshot({ path: "artifacts/trainer-attendance-light.png" });
  await overview.getByLabel("Pilih latihan hari ini").selectOption("later");
  await expect(overview.locator(".present strong")).toHaveText("0");
  await expect(overview.locator(".pending strong")).toHaveText("7");
  await overview.getByRole("button", { name: "Lihat absensi lengkap" }).click();
  await expect(page.locator(".session-card.selected h3")).toHaveText("Latihan sore");
  await expect(page.locator(".session-card h3")).toHaveText(["Latihan sore", "Latihan pagi"]);
  const nav = page.getByRole("navigation", { name: "Navigasi pelatih" });
  await nav.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(overview.locator(".trainer-stat").first()).toBeInViewport();
  await overview.getByRole("button", { name: /Total anggota/ }).click();
  await expect(page.getByRole("heading", { name: /Daftar anggota/ })).toBeVisible();
  await nav.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Ubah tampilan", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/trainer-attendance-dark-320.png" });
  today.status = "selesai";
  await page.reload();
  await overview.getByLabel("Pilih latihan hari ini").selectOption("today");
  await expect(overview.locator(".absent strong")).toHaveText("3");
  await expect(overview).toContainText("Alpa");
  state.sessions = [];
  await page.reload();
  await expect(overview).toContainText("Belum ada latihan hari ini.");
  await expect(overview.locator(".total strong")).toHaveText("7");
  await expect(overview.locator(".present strong")).toHaveText("–");
  await expect(overview.getByRole("button", { name: "Lihat absensi lengkap" })).toHaveCount(0);
});
