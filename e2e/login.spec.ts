import { test, expect } from "@playwright/test";

test("konfigurasi siap dan sesi belum ada tetap mengaktifkan formulir login", async ({
  page,
}) => {
  let remember = false;
  await page.route("**/api/app?*", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Sesi berakhir atau akun tidak aktif. Masuk kembali." },
    }),
  );
  await page.route("**/api/auth", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({
      email: "pelatih@example.test",
      password: "password-uji",
      remember,
    });
    await route.fulfill({
      status: 400,
      json: { error: "Email atau kata sandi tidak sesuai." },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("Penyiapan layanan diperlukan")).toHaveCount(0);
  await page.getByLabel("Email", { exact: true }).fill("pelatih@example.test");
  await page.getByLabel("Kata sandi", { exact: true }).fill("password-uji");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Email atau kata sandi tidak sesuai.",
  );
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeEnabled();
  remember = true;
  await page.getByRole("checkbox", { name: "Ingat saya" }).check();
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Email atau kata sandi tidak sesuai.",
  );
});

test("konfigurasi yang belum diisi tetap menonaktifkan login", async ({
  page,
}) => {
  await page.route("**/api/app?*", (route) =>
    route.fulfill({ json: { configured: false } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText("Penyiapan layanan diperlukan")).toBeVisible();
});
