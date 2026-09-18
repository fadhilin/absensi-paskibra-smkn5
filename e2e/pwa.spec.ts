import { test, expect } from "@playwright/test";
import { useSchoolApi } from "./school-api";

test("manifest, ikon, dan header service worker valid", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("/");
  expect(manifest.icons).toHaveLength(3);
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.ok()).toBe(true);
    expect(asset.headers()["content-type"]).toContain("image/png");
  }
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
  expect(worker.headers()["permissions-policy"]).toContain("geolocation=()");
});

test("lima layar anggota di HP, navigasi tambahan, tema, periode kosong dan profil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useSchoolApi(page, "member");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigasi anggota" });
  await expect(nav).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Aditya Pratama", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Kehadiran saya/ }),
  ).toBeVisible();
  for (const [label, file] of [
    ["Dashboard", "beranda"],
    ["Absensi saya", "absensi"],
    ["Perkembangan saya", "nilai"],
    ["Jadwal latihan", "jadwal"],
    ["Profil saya", "profil"],
  ]) {
    await nav.getByRole("button", { name: label, exact: true }).click();
    await expect(
      nav.getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/pwa-${file}.png`,
      fullPage: false,
    });
  }
  await page.getByText("Data diri", { exact: true }).click();
  await expect(page.locator(".profile-details").first()).toContainText("Email");
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .last()
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "artifacts/pwa-dark.png", fullPage: true });
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Ranking bulanan", exact: true })
    .click();
  await expect(page.getByText("Nadia Putri", { exact: true })).toBeVisible();
  await nav.getByRole("button", { name: "Profil saya", exact: true }).click();
  await page.getByRole("button", { name: "Penghargaan", exact: true }).click();
  await expect(page.locator("main h1")).toHaveText("Penghargaan");
  await nav.getByRole("button", { name: "Absensi saya", exact: true }).click();
  await page.getByRole("button", { name: "Rekap", exact: true }).click();
  await expect(page.locator(".attendance-recap")).toContainText("terlambat");
  await page.getByRole("button", { name: "Riwayat", exact: true }).click();
  await page.getByLabel("Periode", { exact: true }).fill("2000-01");
  await expect(
    page.getByRole("heading", { name: "Belum ada sesi" }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Perkembangan saya", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Belum ada riwayat latihan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Grafik", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Belum ada poin latihan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nilai", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await nav.getByRole("button", { name: "Dashboard", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await nav.getByRole("button", { name: "Profil saya", exact: true }).click();
  await page.getByRole("button", { name: "Keluar akun", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
});

test("offline menampilkan fallback dan cache hanya berisi aset publik", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
  const cachedUrls = await page.evaluate(async () => {
    const names = await caches.keys();
    return (
      await Promise.all(
        names
          .filter((name) => name.startsWith("paskibra-public-"))
          .map(async (name) =>
            (await (await caches.open(name)).keys()).map(
              (r) => new URL(r.url).pathname,
            ),
          ),
      )
    ).flat();
  });
  expect(cachedUrls.sort()).toEqual(
    [
      "/offline.html",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/maskable-512.png",
      "/icons/apple-touch-icon.png",
    ].sort(),
  );
  await context.setOffline(true);
  await expect(
    page.getByRole("status").filter({ hasText: "Anda sedang offline" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Koneksi terputus" }),
  ).toBeVisible();
  await expect(page.getByText("Aditya Pratama", { exact: true })).toHaveCount(
    0,
  );
  await context.setOffline(false);
  await page.getByRole("link", { name: "Coba lagi" }).click();
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
});

test("tombol instalasi memakai prompt browser dan hilang setelah terpasang", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.body.dataset.installRequested = "yes";
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "Pasang aplikasi", exact: true })
    .click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-install-requested",
    "yes",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.getByText("Paskibra sudah terpasang", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pasang aplikasi", exact: true }),
  ).toHaveCount(0);
});
