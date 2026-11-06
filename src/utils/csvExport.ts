// src/utils/csvExport.ts
import { toast } from "react-toastify";

type CsvCell = string | number | null | undefined;

// ── Escapes one cell. Quotes values containing commas, quotes or line breaks,
// and neutralises spreadsheet formulas (a string starting with = + - @ would
// otherwise be executed by Excel when the file is opened).
const escapeCell = (value: CsvCell): string => {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// ── Builds the CSV text only (no BOM — downloadCsv adds it).
export const buildCsv = (header: string[], rows: CsvCell[][]): string =>
  [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");

// ── Lowercase, dash-separated, safe for file names.
export const toFilenamePart = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // "é" → "e", "ñ" → "n"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ── Saves CSV text to disk. Uses the browser's File System Access API
// (showSaveFilePicker), which WebView2 (Chromium-based, used by Tauri on
// Windows) supports directly with no Tauri plugin — same approach as
// fileService.ts. Falls back to blob + <a download> for engines without it.
// A UTF-8 BOM is prepended so Excel reads accented names (e.g. "ñ") correctly.
export const downloadCsv = async (
  filename: string,
  csvContent: string,
  label: string,
): Promise<void> => {
  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  if ("showSaveFilePicker" in window) {
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === "AbortError") return; // user cancelled — no error
      toast.error(`Couldn't save ${label}. Please try again.`);
      return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
