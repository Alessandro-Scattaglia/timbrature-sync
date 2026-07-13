import { z } from "zod";

export const settingsSchema = z.object({
  /** URL della pagina home di Infinity Zucchetti dopo il login */
  zucchettiUrl: z.string().url({ message: "zucchettiUrl deve essere un URL valido" }),

  /** Percorso completo del file Excel (OneDrive, Google Drive Desktop, o locale) */
  excelPath: z.string().min(1, { message: "excelPath non può essere vuoto" }),

  /** Porta su cui gira il server HTTP sulla VM (riceve i dati dal bookmarklet). Default 3131. */
  serverPort: z.number().int().positive().default(3131),

  /** Usato solo per generare la documentazione del Task Scheduler */
  checkIntervalMinutes: z.number().int().positive().default(10),

  /** true = nessuna finestra browser visibile */
  headless: z.boolean().default(true),

  logLevel: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

export type Settings = z.infer<typeof settingsSchema>;
