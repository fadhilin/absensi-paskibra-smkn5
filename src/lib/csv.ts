export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Tanda kutip CSV tidak ditutup.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const head = rows.shift()?.map((h) => h.trim()) ?? [];
  for (const key of [
    "nis",
    "name",
    "class_name",
    "email",
    "joined_on",
    "password",
  ])
    if (!head.includes(key)) throw new Error(`Kolom ${key} wajib tersedia.`);
  return rows.map((r, i) => {
    if (r.length !== head.length)
      throw new Error(`Jumlah kolom baris ${i + 2} tidak sesuai.`);
    return Object.fromEntries(head.map((h, j) => [h, r[j].trim()]));
  });
}
export function toCSV(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
