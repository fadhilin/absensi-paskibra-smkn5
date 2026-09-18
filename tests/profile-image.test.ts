import { expect, it } from "vitest";
import sharp from "sharp";
import { prepareProfileImage } from "../src/lib/profile-image";

it("mengubah foto menjadi JPEG persegi tanpa metadata asal", async () => {
  const bytes = await sharp({
    create: { width: 80, height: 120, channels: 3, background: "#2454ac" },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const result = await prepareProfileImage(
    new File([new Uint8Array(bytes)], "profile.png", { type: "image/png" }),
  );
  const metadata = await sharp(result).metadata();
  expect(metadata).toMatchObject({ format: "jpeg", width: 512, height: 512 });
  expect(metadata.exif).toBeUndefined();
});
it("menolak file palsu, gambar vektor, dan file terlalu besar", async () => {
  await expect(
    prepareProfileImage(new File(["bukan gambar"], "fake.jpg")),
  ).rejects.toThrow("valid");
  await expect(
    prepareProfileImage(
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'],
        "vector.svg",
      ),
    ),
  ).rejects.toThrow("valid");
  await expect(
    prepareProfileImage(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "large.jpg"),
    ),
  ).rejects.toThrow("2 MB");
});
