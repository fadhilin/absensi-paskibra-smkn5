import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = "public/logo-paskibra.png";
await mkdir("public/icons", { recursive: true });
for (const [name, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["maskable-512", 512],
  ["apple-touch-icon", 180],
]) {
  // Kotak logo pada ikon maskable berada di dalam lingkaran aman berdiameter 80%.
  const inset = name === "maskable-512" ? 0.56 : 0.88;
  const logo = await sharp(source)
    .resize(Math.round(size * inset), Math.round(size * inset), {
      fit: "inside",
    })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#ffffff" } })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(`public/icons/${name}.png`);
}
