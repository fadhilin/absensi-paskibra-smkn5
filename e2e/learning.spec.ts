import { expect, test } from "@playwright/test";
import { useSchoolApi, switchRole } from "./school-api";

test.beforeEach(async ({ page }) => {
  await useSchoolApi(page);
  await page.goto("/");
});

test("pengumuman draf, terbit dan arsip melalui pelatih dan anggota", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await nav.getByRole("button", { name: "Pengumuman", exact: true }).click();
  await page
    .getByRole("button", { name: "Buat pengumuman", exact: true })
    .click();
  await page.getByLabel("Judul pengumuman").fill("Jadwal persiapan upacara");
  await page
    .getByLabel("Isi pengumuman")
    .fill("Bawa perlengkapan latihan dan datang tepat waktu.");
  await page
    .getByRole("button", { name: "Simpan pengumuman", exact: true })
    .click();
  await switchRole(page, "member");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Buka pengumuman" }).click();
  await expect(
    page.getByRole("heading", { name: "Jadwal persiapan upacara" }),
  ).toHaveCount(0);
  for (const status of ["published", "archived"]) {
    await switchRole(page, "admin");
    await page.setViewportSize({ width: 1280, height: 900 });
    await nav.getByRole("button", { name: "Pengumuman", exact: true }).click();
    const article = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Jadwal persiapan upacara" }),
    });
    await article.getByRole("button", { name: "Ubah pengumuman" }).click();
    await page.getByLabel("Status publikasi").selectOption(status);
    await page
      .getByLabel("Alasan perubahan", { exact: true })
      .fill("Perbarui status informasi latihan");
    await page
      .getByRole("button", { name: "Simpan pengumuman", exact: true })
      .click();
    await expect(
      article.getByText(status === "published" ? "Terbit" : "Diarsipkan", {
        exact: true,
      }),
    ).toBeVisible();
    await switchRole(page, "member");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Pengumuman", exact: true }).click();
    const title = page.getByRole("heading", {
      name: "Jadwal persiapan upacara",
    });
    if (status === "published") {
      await expect(title).toBeVisible();
      await page.screenshot({ path: "artifacts/pwa-pengumuman.png" });
    } else await expect(title).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Ubah pengumuman" }),
    ).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Kembali ke beranda" }).click();
  await expect(page.getByText("Menu cepat", { exact: true })).toBeVisible();
});

test("kompetensi dinilai pelatih, tampil pribadi dan bisa diperbarui", async ({
  page,
}) => {
  const nav = page.getByRole("navigation", { name: "Navigasi utama" });
  await nav.getByRole("button", { name: "Kompetensi", exact: true }).click();
  await page
    .getByRole("button", { name: "Tambah kompetensi", exact: true })
    .click();
  await page.getByLabel("Nama kompetensi").fill("Pelipatan bendera");
  await page
    .getByLabel("Deskripsi kompetensi")
    .fill("Ketepatan urutan dan kerapian lipatan.");
  await page
    .getByRole("button", { name: "Simpan kompetensi", exact: true })
    .click();
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Pelipatan bendera" }) });
  await card.getByLabel("Tingkat penguasaan").selectOption("berkembang");
  await card
    .getByLabel("Catatan kompetensi")
    .fill("Urutan sudah tepat, rapikan sudut lipatan.");
  await card
    .getByRole("button", { name: "Simpan penilaian kompetensi", exact: true })
    .click();
  await expect(card.locator(".status")).toHaveText("Berkembang");
  await switchRole(page, "member");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Kompetensi", exact: true }).click();
  await expect(card).toContainText(
    "Urutan sudah tepat, rapikan sudut lipatan.",
  );
  await expect(page.getByLabel("Tingkat penguasaan")).toHaveCount(0);
  await page.screenshot({ path: "artifacts/pwa-kompetensi.png" });
  await page
    .getByRole("navigation", { name: "Navigasi anggota" })
    .getByRole("button", { name: "Perkembangan saya", exact: true })
    .click();
  await page.getByRole("button", { name: "Grafik", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Poin per latihan" }),
  ).toBeVisible();
  await expect(page.locator(".score-trend")).toContainText(
    "Penilaian belum lengkap",
  );
  await page.screenshot({ path: "artifacts/pwa-grafik.png" });
  await page.getByRole("button", { name: "Kompetensi", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Kompetensi saya" }),
  ).toBeVisible();
  await switchRole(page, "admin");
  await page.setViewportSize({ width: 1280, height: 900 });
  await nav.getByRole("button", { name: "Kompetensi", exact: true }).click();
  await card.getByLabel("Tingkat penguasaan").selectOption("menguasai");
  await card
    .getByLabel("Alasan perubahan penilaian")
    .fill("Evaluasi latihan berikutnya");
  await card
    .getByRole("button", { name: "Simpan penilaian kompetensi", exact: true })
    .click();
  await expect(card.locator(".status")).toHaveText("Menguasai");
  await card.getByRole("button", { name: "Ubah kompetensi" }).click();
  await page.getByLabel("Status kompetensi").selectOption("false");
  await page
    .getByLabel("Alasan perubahan", { exact: true })
    .fill("Kompetensi sementara dinonaktifkan");
  await page
    .getByRole("button", { name: "Simpan kompetensi", exact: true })
    .click();
  await expect(card.locator(".status")).toHaveText("Nonaktif");
});
