import { z } from "zod";

export const settingsSchema = z.object({
  /** URL della pagina home di Infinity Zucchetti dopo il login */
  zucchettiUrl: z.string().url({ message: "zucchettiUrl deve essere un URL valido" }),

  /** Percorso completo del file Excel (anche dentro una cartella sincronizzata con Google Drive Desktop) */
  excelPath: z.string().min(1, { message: "excelPath non può essere vuoto" }),

  /** Usato solo per generare la documentazione del Task Scheduler: l'app non fa polling interno */
  checkIntervalMinutes: z.number().int().positive().default(10),

  /** true = nessuna finestra browser visibile (uso normale via Task Scheduler) */
  headless: z.boolean().default(true),

  logLevel: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export type Settings = z.infer<typeof settingsSchema>;
