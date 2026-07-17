import * as XLSX from "xlsx";

/**
 * Converts an Excel workbook's first worksheet into plain CSV text, so it
 * can flow through the exact same import/merge pipeline (parseCsvImport)
 * already used for Google Sheets and manual CSV uploads — no separate
 * matching/dedupe logic to maintain for Excel specifically.
 */
export function excelBufferToCsv(buffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_csv(sheet);
}

export async function excelFileToCsv(file) {
  const buffer = await file.arrayBuffer();
  return excelBufferToCsv(buffer);
}

export function isExcelFile(file) {
  const name = (file?.name || "").toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}
