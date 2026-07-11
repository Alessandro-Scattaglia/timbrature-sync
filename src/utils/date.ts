import { MONTHS_IT } from "../constants/excel.js";

/** "Lug 2026" - deve corrispondere ESATTAMENTE al nome del foglio Excel */
export function sheetNameForDate(date: Date): string {
  return `${MONTHS_IT[date.getMonth()]} ${date.getFullYear()}`;
}

/** "11/07/2026" - stesso formato usato nella colonna Data del file */
export function formatDateIt(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getFullYear()}`;
}

/** "2026-07-11" - chiave stabile per lo state.json, indipendente da fuso/formato locale */
export function dayKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
