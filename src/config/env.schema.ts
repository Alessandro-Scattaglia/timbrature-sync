import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  /** Canale Playwright per usare Microsoft Edge già installato sul PC (nessun download extra) */
  EDGE_CHANNEL: z.string().default("msedge"),
});

export const env = envSchema.parse(process.env);
