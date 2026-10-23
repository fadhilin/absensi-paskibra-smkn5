export type PrintableAssessmentRow = {
  nis: string;
  name: string;
  class_name: string;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  total: number;
  grade: string | null;
};

const WIDTH = 1684;
const HEIGHT = 1191;
const ROWS_PER_PAGE = 15;
const encoder = new TextEncoder();

function encodeText(value: string) {
  return encoder.encode(value);
}

function concatenate(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color = "#17243a",
) {
  let size = fontSize;
  context.font = `500 ${size}px Arial, sans-serif`;
  while (size > 15 && context.measureText(value).width > width) {
    size -= 1;
    context.font = `500 ${size}px Arial, sans-serif`;
  }
  context.fillStyle = color;
  context.fillText(value, x, y, width);
}

function pageImage(
  rows: PrintableAssessmentRow[],
  page: number,
  pageCount: number,
  start: string,
  end: string,
  certifiedAt: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF tidak dapat dibuat pada perangkat ini.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, WIDTH, HEIGHT);
  context.textBaseline = "middle";
  context.fillStyle = "#152c52";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("Laporan Penilaian", 60, 72);
  context.fillStyle = "#3d4b60";
  context.font = "400 20px Arial, sans-serif";
  context.fillText(`Periode ${start} sampai ${end}`, 60, 119);
  context.fillText(`Disahkan ${certifiedAt}`, 60, 154);

  const labels = [
    "No.",
    "NIS",
    "Nama",
    "Jurusan",
    "H/T/S/I/A",
    "Total poin",
    "Predikat",
  ];
  const widths = [72, 180, 330, 270, 320, 200, 192];
  const left = 60;
  const top = 210;
  const headerHeight = 64;
  const rowHeight = 52;
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);
  context.fillStyle = "#eaf0fa";
  context.fillRect(left, top, tableWidth, headerHeight);
  context.strokeStyle = "#bdc9dc";
  context.lineWidth = 2;
  context.strokeRect(left, top, tableWidth, headerHeight + rows.length * rowHeight);

  let x = left;
  labels.forEach((label, index) => {
    drawFittedText(context, label, x + 12, top + headerHeight / 2, widths[index] - 24, 19, "#173567");
    x += widths[index];
    if (index < labels.length - 1) {
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, top + headerHeight + rows.length * rowHeight);
      context.stroke();
    }
  });

  rows.forEach((row, index) => {
    const rowTop = top + headerHeight + index * rowHeight;
    context.beginPath();
    context.moveTo(left, rowTop);
    context.lineTo(left + tableWidth, rowTop);
    context.stroke();
    const values = [
      String(page * ROWS_PER_PAGE + index + 1),
      row.nis,
      row.name,
      row.class_name,
      `${row.hadir}/${row.terlambat}/${row.sakit}/${row.izin}/${row.alpa}`,
      String(row.total),
      row.grade ?? "",
    ];
    let cellX = left;
    values.forEach((value, column) => {
      drawFittedText(
        context,
        value,
        cellX + 12,
        rowTop + rowHeight / 2,
        widths[column] - 24,
        19,
      );
      cellX += widths[column];
    });
  });
  context.fillStyle = "#667085";
  context.font = "400 16px Arial, sans-serif";
  context.fillText(`Halaman ${page + 1} dari ${pageCount}`, WIDTH - 220, HEIGHT - 38);

  const encoded = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  const binary = atob(encoded);
  const image = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    image[index] = binary.charCodeAt(index);
  return image;
}

export function createAssessmentPdf(
  rows: PrintableAssessmentRow[],
  start: string,
  end: string,
  certifiedAt: string,
) {
  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const objects: Uint8Array[] = [
    encodeText("<< /Type /Catalog /Pages 2 0 R >>"),
    encodeText(
      `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, page) => `${3 + page * 3} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    ),
  ];

  for (let page = 0; page < pageCount; page++) {
    const pageId = 3 + page * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const pageRows = rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
    const image = pageImage(pageRows, page, pageCount, start, end, certifiedAt);
    const content = encodeText("q 841.89 0 0 595.28 0 0 cm /Im0 Do Q");
    objects.push(
      encodeText(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 841.89 595.28] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
      concatenate([
        encodeText(`<< /Length ${content.length} >>\nstream\n`),
        content,
        encodeText("\nendstream"),
      ]),
      concatenate([
        encodeText(
          `<< /Type /XObject /Subtype /Image /Width ${WIDTH} /Height ${HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`,
        ),
        image,
        encodeText("\nendstream"),
      ]),
    );
  }

  const chunks: Uint8Array[] = [encodeText("%PDF-1.4\n")];
  const offsets = [0];
  let byteLength = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(byteLength);
    const wrapped = concatenate([
      encodeText(`${index + 1} 0 obj\n`),
      object,
      encodeText("\nendobj\n"),
    ]);
    chunks.push(wrapped);
    byteLength += wrapped.length;
  });
  const xrefOffset = byteLength;
  const crossReference = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ].join("");
  chunks.push(encodeText(crossReference));
  const pdfBytes = concatenate(chunks);
  return new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}
