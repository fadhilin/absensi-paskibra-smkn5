import { expect, test } from "@playwright/test";
import { useSchoolApi, switchRole } from "./school-api";

test("kriteria 0–100 masuk rincian dan donat akumulasi hanya di Grafik", async ({
  page,
}) => {
  await useSchoolApi(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("button", { name: /^Penilaian/ })
    .click();
  await page
    .getByText("Ketentuan penilaian · skala 0–100", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tambah kriteria", exact: true })
    .click();
  await page
    .getByLabel("Kriteria 7", { exact: true })
    .fill("Ketepatan gerakan");
  await page
    .getByLabel("Alasan perubahan kriteria")
    .fill("Tambahkan ketepatan gerakan regu");
  await page
    .getByRole("button", { name: "Simpan ketentuan penilaian" })
    .click();
  const card = page.locator(".criteria-grade-card").first();
  await expect(
    card.getByRole("slider", { name: "Ketepatan gerakan", exact: true }),
  ).toBeVisible();
  for (const input of await card.locator('input[type="number"]').all()) {
    await expect(input).toHaveAttribute("min", "0");
    await expect(input).toHaveAttribute("max", "100");
    await input.fill("80");
  }
  if (await card.getByLabel("Alasan perubahan", { exact: true }).count())
    await card
      .getByLabel("Alasan perubahan", { exact: true })
      .fill("Periksa ulang semua kriteria");
  await card.getByRole("button", { name: "Simpan nilai", exact: true }).click();
  await expect(card).toContainText("560 / 700");
  await switchRole(page, "member");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("navigation", { name: "Navigasi anggota" })
    .getByRole("button", { name: "Perkembangan saya", exact: true })
    .click();
  await expect(page.locator(".score-donut")).toHaveCount(0);
  await expect(page.locator(".score-detail-list").first()).toContainText(
    "Ketepatan gerakan",
  );
  for (const detail of await page.locator(".score-detail-card").all()) {
    const attendance = detail.locator(".score-attendance-list");
    await expect(attendance).toContainText("Kehadiran");
    const status = await attendance.locator("dd").first().innerText();
    const attendancePoints = status === "Hadir" ? 10 : 7;
    await expect(attendance.locator("dd").last()).toHaveText(`${attendancePoints} poin`);
    const values = await detail.locator(".score-detail-list dd").allTextContents();
    const subtotal = values.reduce((sum, value) => sum + (Number.parseInt(value, 10) || 0), 0);
    await expect(detail.locator(".score-points-list dd").first()).toHaveText(`${subtotal} poin`);
    await expect(detail.locator(".score-session-total dd")).toHaveText(`${subtotal + attendancePoints} poin`);
    if (values.some(value => value.includes("Belum dinilai")))
      await expect(detail).toContainText("Total sementara");
  }
  await page.screenshot({ path: "artifacts/member-daily-points.png", fullPage: true });
  const scores = await page.locator(".score-detail-list dd").allTextContents();
  const total = scores.reduce(
    (sum, value) => sum + (Number.parseInt(value, 10) || 0),
    0,
  );
  const maximum = scores.length * 100;
  await page.getByRole("button", { name: "Grafik", exact: true }).click();
  await expect(page.locator(".score-donut strong")).toHaveText(
    `${Math.round((total / maximum) * 100)}%`,
  );
  await expect(page.locator(".score-donut-summary")).toContainText(
    `${total} / ${maximum}`,
  );
  await page.screenshot({ path: "artifacts/pwa-grafik-akumulasi.png" });
  const memberNav = page.getByRole("navigation", { name: "Navigasi anggota" });
  await memberNav
    .getByRole("button", { name: "Profil saya", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ubah tampilan", exact: true })
    .last()
    .click();
  await memberNav
    .getByRole("button", { name: "Perkembangan saya", exact: true })
    .click();
  await page.getByRole("button", { name: "Grafik", exact: true }).click();
  await page.screenshot({ path: "artifacts/pwa-grafik-dark.png" });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Nilai", exact: true }).click();
  await expect(page.locator(".score-donut")).toHaveCount(0);
});

test("anggota dapat memilih, menyimpan, dan menghapus foto profil", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/profile/photo")).status()).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await useSchoolApi(page, "member");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigasi anggota" });
  await nav.getByRole("button", { name: "Profil saya", exact: true }).click();
  await page.getByText("Ubah foto profil", { exact: true }).click();
  await page.getByLabel("Pilih foto profil").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("test"),
  });
  await expect(
    page.locator(".profile-photo-editor").getByRole("alert"),
  ).toContainText("Pilih JPG, PNG, atau WebP");
  await page
    .getByLabel("Pilih foto profil")
    .setInputFiles("public/icons/icon-192.png");
  await expect(
    page.getByRole("img", { name: "Pratinjau foto profil baru" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simpan foto profil", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Foto profil Aditya Pratama", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/pwa-profil-foto.png" });
  await nav.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Foto profil Aditya Pratama", exact: true }),
  ).toBeVisible();
  await switchRole(page, "admin");
  await page.getByRole("navigation", { name: "Navigasi pelatih" })
    .getByRole("button", { name: "Anggota", exact: true }).click();
  const memberRow = page.getByRole("row").filter({ hasText: "Aditya Pratama" });
  const memberPhoto = memberRow.getByRole("img", { name: "Foto profil Aditya Pratama", exact: true });
  await expect(memberPhoto).toBeVisible();
  await expect(memberPhoto).toHaveAttribute("src", /member=demo-1&v=/);
  await expect.poll(() => memberPhoto.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(memberRow.locator(".avatar")).toHaveCSS("width", "36px");
  await page.screenshot({ path: "artifacts/trainer-member-photo.png" });
  await switchRole(page, "member");
  await nav.getByRole("button", { name: "Profil saya", exact: true }).click();
  await page.getByText("Ubah foto profil", { exact: true }).click();
  await page.getByRole("button", { name: "Hapus foto", exact: true }).click();
  await page
    .getByRole("button", { name: "Ya, hapus foto", exact: true })
    .click();
  await expect(
    page.getByRole("img", { name: "Foto profil Aditya Pratama", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Foto profil dihapus.", { exact: true }),
  ).toBeVisible();
  await switchRole(page, "admin");
  await page.getByRole("navigation", { name: "Navigasi pelatih" })
    .getByRole("button", { name: "Anggota", exact: true }).click();
  await expect(memberPhoto).toHaveCount(0);
  await expect(memberRow.locator(".avatar")).toHaveText("AP");
});
