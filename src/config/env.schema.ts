import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  /** Canale Playwright per usare Microsoft Edge gia installato sul PC (nessun download extra) */
  EDGE_CHANNEL: z.string().default("msedge"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().optional(),
  SERVER_PROTOCOL: z.enum(["http", "https"]).default("https"),
  SSL_KEY: z.string().default("certs/key.pem"),
  SSL_CERT: z.string().default("certs/cert.pem"),
  CORS_ORIGIN: z.string().default("https://saas.hrzucchetti.it"),
  BOOKMARKLET_SERVER: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
