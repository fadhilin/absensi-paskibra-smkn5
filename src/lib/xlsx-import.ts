import { strFromU8, unzipSync } from "fflate";

const requiredColumns = [
  "nis",
  "name",
  "class_name",
  "email",
  "joined_on",
  "password",
];

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) throw new Error("Format kolom Excel tidak dikenali.");
  return [...letters].reduce(
    (index, letter) => index * 26 + letter.charCodeAt(0) - 64,
    0,
  ) - 1;
}

function normalizePath(path: string) {
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function textContent(element: Element) {
  return Array.from(element.getElementsByTagName("t"))
    .map((part) => part.textContent ?? "")
    .join("");
}

function excelDate(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return value;
  const date = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000);
  return date.toISOString().slice(0, 10);
}

export function parseXlsx(buffer: ArrayBuffer): Record<string, string>[] {
  const archive = unzipSync(new Uint8Array(buffer));
  const readXml = (path: string) => {
    const file = archive[path];
    if (!file) return null;
    return new DOMParser().parseFromString(strFromU8(file), "application/xml");
  };
  const workbook = readXml("xl/workbook.xml");
  const relationships = readXml("xl/_rels/workbook.xml.rels");
  const firstSheetId = workbook
    ?.getElementsByTagName("sheet")[0]
    ?.getAttribute("r:id");
  const sheetTarget = firstSheetId
    ? Array.from(relationships?.getElementsByTagName("Relationship") ?? [])
        .find((item) => item.getAttribute("Id") === firstSheetId)
        ?.getAttribute("Target")
    : null;
  const sheetPath = sheetTarget
    ? normalizePath(
        sheetTarget.startsWith("/") ? sheetTarget : `xl/${sheetTarget}`,
      )
    : "xl/worksheets/sheet1.xml";
  const sheet = readXml(sheetPath);
  if (!sheet || sheet.getElementsByTagName("parsererror").length)
    throw new Error("Berkas Excel tidak dapat dibaca. Gunakan template .xlsx.");

  const sharedStrings = readXml("xl/sharedStrings.xml");
  const strings = Array.from(sharedStrings?.getElementsByTagName("si") ?? []).map(
    textContent,
  );
  const rows = Array.from(sheet.getElementsByTagName("row")).map((row) => {
    const cells: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName("c"))) {
      const reference = cell.getAttribute("r");
      if (!reference) continue;
      const index = columnIndex(reference);
      const type = cell.getAttribute("t");
      const value =
        type === "inlineStr"
          ? textContent(cell)
          : cell.getElementsByTagName("v")[0]?.textContent ?? "";
      cells[index] = type === "s" ? (strings[Number(value)] ?? "") : value;
    }
    return cells.map((value) => value ?? "");
  });

  const headerIndex = rows.findIndex((row) => row.some((value) => value.trim()));
  const header = rows[headerIndex]?.map((value) => value.trim()) ?? [];
  for (const key of requiredColumns)
    if (!header.includes(key)) throw new Error(`Kolom ${key} wajib tersedia.`);

  return rows.slice(headerIndex + 1).flatMap((row, index) => {
    if (!row.some((value) => value.trim())) return [];
    if (row.length > header.length && row.slice(header.length).some((x) => x.trim()))
      throw new Error(`Jumlah kolom baris ${index + headerIndex + 2} tidak sesuai.`);
    const values = Object.fromEntries(
      header.map((key, column) => [key, row[column]?.trim() ?? ""]),
    );
    values.joined_on = excelDate(values.joined_on);
    return [values];
  });
}
