import sharp from "sharp";

export async function prepareProfileImage(file: File) {
  if (!file.size || file.size > 2 * 1024 * 1024)
    throw new Error("Foto profil maksimal 2 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const options = { limitInputPixels: 16000000 };
  try {
    const metadata = await sharp(bytes, options).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) !== 1
    )
      throw new Error("format");
    return await sharp(bytes, options)
      .rotate()
      .resize(512, 512, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    throw new Error(
      "Gunakan foto JPG, PNG, atau WebP yang valid, maksimal 16 megapiksel.",
    );
  }
}
