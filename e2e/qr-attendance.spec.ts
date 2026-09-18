import { expect, test, type Page } from "@playwright/test";
import QRCode from "qrcode";
import { useSchoolApi, switchRole } from "./school-api";

async function mockQrCamera(page: Page, image: string) {
  await page.evaluate(async (src) => {
    const picture = new Image();
    picture.src = src;
    await picture.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 720;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "white";
    context.fillRect(0, 0, 720, 720);
    context.drawImage(picture, 0, 0, 720, 720);
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const stream = canvas.captureStream(10);
        const frames = setInterval(() => {
          if (stream.getVideoTracks()[0].readyState === "ended") {
            clearInterval(frames);
            return;
          }
          context.drawImage(picture, 0, 0, 720, 720);
        }, 100);
        return stream;
      },
    });
    Object.defineProperty(navigator.geolocation, "getCurrentPosition", {
      configurable: true,
      value: () => {
        document.body.dataset.geolocationCalled = "yes";
        throw new Error("GPS tidak boleh dipanggil");
      },
    });
  }, image);
}
test("pelatih menghasilkan, mengunduh, membagikan QR; anggota scan dan jam muncul pada rekap", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/attendance?session=anything")).status()).toBe(
    401,
  );
  expect(
    (
      await request.post("/api/attendance", {
        headers: { Origin: "http://localhost:3100" },
        data: { token: "PASKIBRA-DEMO:invalid", session_id: "s-next" },
      })
    ).status(),
  ).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await useSchoolApi(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigasi pelatih" })
    .getByRole("button", { name: "Latihan & absensi", exact: true })
    .click();
  const session = page.locator(".session-card").filter({
    has: page.getByRole("heading", {
      name: "Latihan rutin Paskibra",
      exact: true,
    }),
  });
  await session
    .getByRole("button", { name: "Generate QR", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const qr = dialog.getByRole("img", {
    name: "QR absensi Latihan rutin Paskibra",
  });
  await expect(qr).toBeVisible();
  const image = (await qr.getAttribute("src"))!;
  const downloadEvent = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Unduh QR", exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /^qr-latihan-.*\.png$/,
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (value: ShareData) => {
        document.body.dataset.sharedQr = value.files?.[0]?.type;
      },
    });
  });
  await dialog.getByRole("button", { name: "Bagikan QR", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-shared-qr",
    "image/png",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  const fallback = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Bagikan QR", exact: true }).click();
  await fallback;
  await expect(dialog).toContainText("Lampirkan gambar ini");
  await page.screenshot({ path: "artifacts/trainer-qr.png" });
  await dialog
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await switchRole(page, "member");
  await page
    .getByRole("navigation", { name: "Navigasi anggota" })
    .getByRole("button", { name: "Absensi saya", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Scan QR absensi", exact: true })
    .click();
  await mockQrCamera(page, image);
  await dialog
    .getByRole("button", { name: "Buka pemindai QR", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Absensi berhasil tercatat" }),
  ).toBeVisible();
  await expect(dialog).toContainText("Aditya Pratama");
  await expect(dialog).toContainText("Jam absensi");
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-geolocation-called",
    "yes",
  );
  await page.screenshot({ path: "artifacts/member-qr-receipt.png" });
  await dialog.getByRole("button", { name: "Selesai", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Scan QR absensi", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".member-attendance-row").first()).toContainText(
    "Jam absensi",
  );
  await switchRole(page, "admin");
  await page
    .getByRole("navigation", { name: "Navigasi pelatih" })
    .getByRole("button", { name: "Latihan & absensi", exact: true })
    .click();
  await session
    .getByRole("button", { name: "Lihat absensi", exact: true })
    .click();
  const row = page.getByRole("row").filter({ hasText: "Aditya Pratama" });
  await expect(row).toContainText("Scan QR");
  await expect(row).not.toContainText("Tidak tersedia");
});

test("QR asing ditolak tanpa absensi dan menutup pemindai menghentikan kamera", async ({
  page,
}) => {
  await useSchoolApi(page, "member");
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("button", { name: "Absensi saya", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Scan QR absensi", exact: true })
    .click();
  await mockQrCamera(
    page,
    await QRCode.toDataURL("https://example.com/not-attendance", {
      width: 720,
    }),
  );
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Buka pemindai QR", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "QR bukan kode absensi Paskibra yang valid",
  );
  expect(
    await dialog
      .locator("video")
      .evaluate((v) =>
        ((v as HTMLVideoElement).srcObject as MediaStream)
          .getTracks()
          .every((t) => t.readyState === "ended"),
      ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Tutup dialog", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Scan QR absensi", exact: true }),
  ).toBeEnabled();
});
