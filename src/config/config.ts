import fs from "node:fs";
import path from "node:path";
import { settingsSchema, type Settings } from "./settings.schema.js";

const SETTINGS_PATH = path.resolve(process.cwd(), "settings.json");

function readSettingsFile(): unknown {
  if (!fs.existsSync(SETTINGS_PATH)) {
    throw new Error(`File di configurazione non trovato: ${SETTINGS_PATH}`);
  }
  const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`settings.json non è un JSON valido: ${(err as Error).message}`);
  }
}

let cached: Settings | undefined;

/** Legge e valida settings.json (con Zod). Risultato in cache per l'intera esecuzione. */
export function loadConfig(): Settings {
  if (cached) return cached;

  const raw = readSettingsFile();
  const result = settingsSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`settings.json non valido:\n${details}`);
  }

  cached = result.data;
  return cached;
}

/** Percorsi fissi dell'area dati locale del progetto (non sincronizzata su git). */
export const paths = {
  storageRoot: path.resolve(process.cwd(), "storage"),
  sessionDir: path.resolve(process.cwd(), "storage", "session"),
  stateFile: path.resolve(process.cwd(), "storage", "state", "state.json"),
  logsDir: path.resolve(process.cwd(), "storage", "logs"),
};
