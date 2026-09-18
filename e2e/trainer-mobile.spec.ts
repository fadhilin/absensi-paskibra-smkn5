import { expect, test } from "@playwright/test";
import { useSchoolApi } from "./school-api";

test("pelatih memakai navigasi HP, pencarian, dan slider 0–100", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useSchoolApi(page);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigasi pelatih" });
  await expect(nav.getByRole("button")).toHaveCount(5);
  await expect(
    page.getByRole("heading", { name: "Pelatih Uji", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/trainer-beranda.png" });
  await nav.getByRole("button", { name: "Penilaian", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Cari anggota untuk dinilai",
  });
  await search.fill("aditya");
  const card = page.locator(".criteria-grade-card:visible");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Aditya Pratama");
  const slider = card.getByRole("slider", { name: "PBB", exact: true });
  const number = card.getByRole("spinbutton", {
    name: "Nilai PBB",
    exact: true,
  });
  await slider.scrollIntoViewIfNeeded();
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(number).toHaveValue("100");
  await slider.press("Home");
  await expect(number).toHaveValue("0");
  await expect(slider).toHaveAttribute("aria-valuetext", "0 dari 100");
  await search.fill("Nadia");
  await expect(card).toContainText("Nadia Putri");
  await search.fill("260001");
  await expect(card).toContainText("Aditya Pratama");
  await expect(number).toHaveValue("0");
  await card
    .getByLabel("Alasan perubahan", { exact: true })
    .fill("Penilaian ulang gerakan dasar");
  await card.getByRole("button", { name: "Simpan nilai", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("berhasil");
  await expect(number).toHaveValue("0");
  await card
    .getByRole("button", { name: "Kosongkan PBB", exact: true })
    .click();
  await expect(number).toHaveValue("");
  await expect(slider).toHaveAttribute("aria-valuetext", "Belum dinilai");
  await slider.press("Home");
  await expect(number).toHaveValue("0");
  await slider.press("End");
  await expect(number).toHaveValue("100");
  await slider.press("ArrowLeft");
  await expect(number).toHaveValue("99");
  await number.fill("84");
  await expect(slider).toHaveValue("84");
  await expect(card).toContainText("Perubahan belum disimpan.");
  await search.fill("XI TKJ 1");
  await expect(page.locator(".criteria-grade-card:visible")).toHaveCount(3);
  await search.fill("anggota tidak ada");
  await expect(
    page.getByRole("heading", { name: "Anggota tidak ditemukan" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hapus pencarian", exact: true })
    .click();
  await expect(page.locator(".criteria-grade-card:visible")).toHaveCount(8);
  await search.fill("Aditya");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "artifacts/trainer-penilaian.png" });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "artifacts/trainer-penilaian-320.png" });
  await card
    .locator(".section-heading")
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: "artifacts/trainer-slider-320.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await nav
    .getByRole("button", { name: "Profil pelatih", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/trainer-profil-dark.png" });
  await nav.getByRole("button", { name: "Penilaian", exact: true }).click();
  await page.screenshot({ path: "artifacts/trainer-penilaian-dark.png" });
  await page
    .locator(".criteria-grade-card")
    .first()
    .locator(".section-heading")
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await page.screenshot({ path: "artifacts/trainer-slider-dark.png" });
  await nav
    .getByRole("button", { name: "Profil pelatih", exact: true })
    .click();
  for (const [label, heading] of [
    ["Laporan bulanan", "Laporan"],
    ["Pengaturan sekolah", "Pengaturan"],
    ["Pengumuman", "Pengumuman"],
  ]) {
    await page
      .locator(".trainer-profile")
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.locator("main h1")).toHaveText(heading);
    await nav
      .getByRole("button", { name: "Profil pelatih", exact: true })
      .click();
  }
  await page
    .locator(".trainer-profile")
    .getByRole("button", { name: "Keluar akun", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
});
