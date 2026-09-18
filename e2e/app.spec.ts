import { test, expect } from "@playwright/test";
import { useSchoolApi, switchRole } from "./school-api";
test("endpoint data merespons JSON dan tidak membuka data tanpa login", async ({
  request,
}) => {
  const response = await request.get("/api/app?month=2026-09");
  expect([200, 401]).toContain(response.status());
  const body = await response.json();
  expect(body).not.toHaveProperty("state");
  if (response.status() === 200) expect(body.configured).toBe(false);
});
test("kamera pemindai QR dapat dibuka dan dihentikan tanpa lokasi", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["camera"]);
  await switchRole(page, "member");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Absensi saya", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Scan QR absensi", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Buka pemindai QR", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Hentikan pemindai", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .locator("video")
        .evaluate((video) => (video as HTMLVideoElement).videoWidth),
    )
    .toBeGreaterThan(0);
  await dialog
    .getByRole("button", { name: "Hentikan pemindai", exact: true })
    .click();
  await expect(
    dialog.getByText("Pemindai belum dibuka", { exact: true }),
  ).toBeVisible();
  expect(
    await dialog
      .locator("video")
      .evaluate((video) =>
        ((video as HTMLVideoElement).srcObject as MediaStream)
          .getTracks()
          .every((t) => t.readyState === "ended"),
      ),
  ).toBe(true);
});
test.beforeEach(async ({ page }) => {
  await useSchoolApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Selamat datang, Pelatih" }),
  ).toBeVisible();
});
test("seluruh navigasi pelatih, tema, tampilan mobile dan keluar", async ({
  page,
}) => {
  for (const name of [
    "Anggota",
    "Latihan & absensi",
    "Penilaian",
    "Ranking bulanan",
    "Penghargaan",
    "Laporan",
    "Pengaturan",
    "Dashboard",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: new RegExp("^" + name.replace("&", "&")) })
      .click();
    await expect(page.locator("main h1")).toBeVisible();
  }
  await page.screenshot({
    path: "artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("banner").getByRole("button", { name: "Ubah tampilan" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Anggota", exact: true }),
  ).toHaveCSS("color", "rgb(179, 184, 188)");
  await page.screenshot({
    path: "artifacts/dashboard-dark.png",
    fullPage: true,
  });
  await page.getByRole("banner").getByRole("button", { name: "Ubah tampilan" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/dashboard-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Menu", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Navigasi pelatih" })
    .getByRole("button", { name: "Anggota", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Daftar anggota" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Navigasi pelatih" })
    .getByRole("button", { name: "Profil pelatih", exact: true })
    .click();
  await page.getByRole("button", { name: "Keluar akun" }).click();
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
});
test("tambah, cari, ubah dan nonaktifkan anggota, validasi duplikat", async ({
  page,
}) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Anggota", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Tambah anggota" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama lengkap").fill("Anggota Pengujian");
  await dialog.getByLabel("Nomor induk").fill("TEST001");
  await dialog.getByLabel("Kelas", { exact: true }).fill("X RPL");
  await dialog.getByLabel("Tanggal bergabung").fill("2026-01-01");
  await dialog.getByLabel("Email akun").fill("test@example.test");
  await dialog.getByLabel("Kata sandi awal").fill("password12345");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel("Cari anggota").fill("TEST001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Ubah", exact: true }).click();
  await dialog.getByLabel("Status akun").selectOption("false");
  await dialog.getByLabel("Alasan perubahan").fill("Selesai keanggotaan");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByText("Nonaktif", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset sandi" }).click();
  await dialog.getByLabel("Kata sandi baru").fill("password67890");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Kata sandi berhasil diatur ulang.");
});
test("form latihan, Escape, aturan poin, ekspor dan pengesahan berjalan ditolak", async ({
  page,
}) => {
  await page.getByRole("button", { name: "+ Buat latihan" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Pengaturan", exact: true })
    .click();
  await page.getByLabel("Nama sekolah / regu").fill("Regu Uji");
  await page.getByRole("button", { name: "Simpan identitas" }).click();
  await expect(page.getByRole("status")).toContainText("berhasil");
  await page.getByLabel("Poin hadir", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Simpan aturan poin" }).click();
  await expect(page.locator("main").getByRole("alert")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Laporan", exact: true })
    .click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ekspor CSV" }).click();
  expect((await pending).suggestedFilename()).toContain("rekap-paskibra");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Ranking bulanan", exact: true })
    .click();
  await page.getByRole("button", { name: "Sahkan hasil bulanan" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Simpan", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Bulan belum berakhir",
  );
});
test("anggota hanya melihat rincian sendiri dan penolakan kamera diberi pesan", async ({
  page,
}) => {
  await switchRole(page, "member");
  await expect(
    page
      .getByRole("navigation")
      .getByRole("button", { name: "Anggota", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Perkembangan saya", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rincian latihan saya" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Ranking bulanan", exact: true })
    .click();
  await expect(page.getByText("Nadia Putri", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Keaktifan" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Absensi saya", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Scan QR absensi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ambil foto", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Buka pemindai QR", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
});
test("buat, ubah, koreksi izin dan batalkan latihan", async ({ page }) => {
  await page.getByRole("button", { name: "+ Buat latihan" }).click();
  const dialog = page.getByRole("dialog");
  const month = await page.getByLabel("Periode", { exact: true }).inputValue();
  const end = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  await dialog.getByLabel("Nama latihan").fill("Latihan pengujian");
  await dialog.getByLabel("Tanggal latihan").fill(`${month}-${end}`);
  await dialog.getByLabel("Lokasi", { exact: true }).fill("Lapangan uji");
  await expect(dialog.getByLabel("Radius (meter)")).toHaveCount(0);
  await expect(dialog.getByLabel("Latitude", { exact: true })).toHaveCount(0);
  await expect(dialog.getByLabel("Longitude", { exact: true })).toHaveCount(0);
  await dialog.getByLabel("Buka absensi").fill("07:00");
  await dialog.getByLabel("Batas tepat waktu").fill("07:30");
  await dialog.getByLabel("Tutup absensi").fill("23:59");
  await dialog.getByLabel("Materi latihan").fill("Latihan formasi");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Latihan & absensi", exact: true })
    .click();
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Latihan pengujian",
      exact: true,
    }),
  });
  await card.getByRole("button", { name: "Ubah", exact: true }).click();
  await dialog.getByLabel("Lokasi").fill("Lapangan utama sekolah");
  await dialog.getByLabel("Alasan perubahan").fill("Penyesuaian lapangan");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(card).toContainText("Lapangan utama sekolah");
  await card.getByRole("button", { name: "Lihat absensi" }).click();
  await page.getByRole("button", { name: "Kelola status" }).click();
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("izin");
  await dialog.getByLabel("Alasan", { exact: true }).fill("Keperluan keluarga");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(
    page.locator("tbody").getByText("izin", { exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Batalkan", exact: true }).click();
  await dialog.getByLabel("Alasan wajib").fill("Lapangan tidak tersedia");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(card).toContainText("dibatalkan");
});
test("impor CSV, template, penilaian, dan prestasi", async ({ page }) => {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Anggota", exact: true })
    .click();
  await page.getByRole("button", { name: "Impor CSV", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const dl = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Unduh template CSV" }).click();
  expect((await dl).suggestedFilename()).toBe("template-anggota.csv");
  await dialog.getByLabel("Berkas CSV").setInputFiles({
    name: "anggota.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "nis,name,class_name,email,joined_on,password\nIMPORT1,Anggota CSV,X RPL,csv@example.test,2026-01-01,password12345",
    ),
  });
  await dialog
    .getByRole("button", { name: "Impor anggota", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("Anggota CSV", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^Penilaian/ })
    .click();
  const first = page.locator(".criteria-grade-card").first();
  await first.getByLabel("Nilai PBB", { exact: true }).fill("95");
  await first.getByLabel("Nilai Sikap & disiplin", { exact: true }).fill("90");
  await first.getByLabel("Alasan perubahan").fill("Penilaian diperiksa ulang");
  await first
    .getByRole("button", { name: "Simpan nilai", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("berhasil");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Penghargaan", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Catat prestasi" }).click();
  await dialog.getByLabel("Prestasi / kegiatan").fill("Lomba PBB uji");
  await dialog.getByLabel("Tanggal", { exact: true }).fill("2026-09-01");
  await dialog.getByLabel("Keterangan").fill("Prestasi contoh untuk pengujian");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByText("Lomba PBB uji", { exact: true })).toBeVisible();
});
test("sahkan bulan kosong lalu buka kembali dengan audit", async ({ page }) => {
  await page.getByLabel("Periode", { exact: true }).fill("2025-01");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Ranking bulanan", exact: true })
    .click();
  await page.getByRole("button", { name: "Sahkan hasil bulanan" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Catatan pengesahan")
    .fill("Tidak ada latihan bulan ini");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hasil bulanan disahkan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buka kembali", exact: true }).click();
  await dialog.getByLabel("Alasan wajib").fill("Memeriksa data historis");
  await dialog.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sahkan hasil bulanan" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Pengaturan", exact: true })
    .click();
  await expect(
    page.locator("summary").filter({ hasText: "reopen" }),
  ).toBeVisible();
});
