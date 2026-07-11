import fs from "node:fs";
import path from "node:path";
import { paths } from "../config/config.js";
import type { DayState, SyncState } from "../types/state.js";

function ensureStateFile(): void {
  const dir = path.dirname(paths.stateFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(paths.stateFile)) {
    fs.writeFileSync(paths.stateFile, JSON.stringify({ days: {} } satisfies SyncState, null, 2));
  }
}

export function loadState(): SyncState {
  ensureStateFile();
  const raw = fs.readFileSync(paths.stateFile, "utf-8");
  return JSON.parse(raw) as SyncState;
}

export function saveState(state: SyncState): void {
  ensureStateFile();
  fs.writeFileSync(paths.stateFile, JSON.stringify(state, null, 2));
}

export function getDayState(state: SyncState, key: string): DayState | undefined {
  return state.days[key];
}

export function setDayState(state: SyncState, key: string, day: DayState): void {
  state.days[key] = day;
}

/**
 * Confronta i valori appena letti da Zucchetti con quelli già sincronizzati
 * e restituisce SOLO i campi effettivamente nuovi o cambiati. Questo è il
 * meccanismo anti-duplicati: se T1/T2/T5 sono identici a quanto già scritto,
 * non si tocca l'Excel.
 */
export function diffAgainstState(
  previous: DayState | undefined,
  fresh: { t1?: string; t2?: string; t5?: string }
): { t1?: string; t2?: string; t5?: string } {
  const diff: { t1?: string; t2?: string; t5?: string } = {};
  if (fresh.t1 && fresh.t1 !== previous?.t1) diff.t1 = fresh.t1;
  if (fresh.t2 && fresh.t2 !== previous?.t2) diff.t2 = fresh.t2;
  if (fresh.t5 && fresh.t5 !== previous?.t5) diff.t5 = fresh.t5;
  return diff;
}
