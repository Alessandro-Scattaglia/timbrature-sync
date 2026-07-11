import { chromium, type BrowserContext } from "playwright";
import { env } from "../config/env.schema.js";
import { paths } from "../config/config.js";

export interface SessionOptions {
  headless: boolean;
}

/**
 * Usa un profilo Edge persistente (storage/session) invece di un semplice
 * storageState "usa e getta": mantiene cookie, cache e stato SSO reali tra
 * un'esecuzione e l'altra, riducendo la frequenza dei re-login richiesti da
 * Microsoft Entra ID. Usa il canale "msedge" di Playwright, che pilota
 * l'Edge già installato sul PC (nessun browser aggiuntivo da scaricare).
 */
export async function openBrowserSession(opts: SessionOptions): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(paths.sessionDir, {
    channel: env.EDGE_CHANNEL,
    headless: opts.headless,
    viewport: { width: 1400, height: 900 },
  });

  return context;
}
