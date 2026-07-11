import type { BrowserContext } from "playwright";
import { loadConfig } from "../config/config.js";
import { createLogger } from "../logger/logger.js";
import { openBrowserSession } from "../playwright/browserSession.js";
import { ensureLoggedIn } from "../services/microsoft/entraLogin.js";
import { ZucchettiClient } from "../services/zucchetti/zucchettiClient.js";
import { deriveDayTimes } from "../services/zucchetti/parser.js";
import { ExcelWriter } from "../excel/excelWriter.js";
import { loadState, saveState, getDayState, setDayState, diffAgainstState } from "../state/stateStore.js";
import { dayKey } from "../utils/date.js";

/**
 * Un ciclo completo:
 *   apri sessione browser -> verifica login -> leggi timbrature di oggi ->
 *   confronta con lo stato salvato -> scrivi su Excel solo ciò che è nuovo ->
 *   aggiorna lo stato -> chiudi tutto.
 *
 * Pensato per essere lanciato una volta per esecuzione (nessun processo
 * infinito): la ripetizione è demandata a Windows Task Scheduler.
 */
export async function runSyncCycle(): Promise<void> {
  const settings = loadConfig();
  const logger = createLogger(settings.logLevel);

  logger.info("=== Avvio ciclo di sincronizzazione ===");

  let context: BrowserContext | undefined;

  try {
    context = await openBrowserSession({ headless: settings.headless });
    const page = context.pages()[0] ?? (await context.newPage());

    await page.goto(settings.zucchettiUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await ensureLoggedIn(page, logger, settings.headless);

    const client = new ZucchettiClient(page, settings.zucchettiUrl, logger);
    const punches = await client.scrapeToday();
    const derived = deriveDayTimes(punches);

    const today = new Date();
    const key = dayKey(today);

    const state = loadState();
    const previous = getDayState(state, key);
    const toWrite = diffAgainstState(previous, derived);

    if (!toWrite.t1 && !toWrite.t2 && !toWrite.t5) {
      logger.info("Nessuna timbratura nuova rispetto all'ultima sincronizzazione. Fine ciclo.");
      return;
    }

    const writer = new ExcelWriter(settings.excelPath, logger);
    await writer.updateDay(today, toWrite);

    setDayState(state, key, {
      t1: derived.t1 ?? previous?.t1,
      t2: derived.t2 ?? previous?.t2,
      t5: derived.t5 ?? previous?.t5,
      lastSync: new Date().toISOString(),
    });
    saveState(state);

    logger.info("=== Ciclo completato con successo ===");
  } catch (err) {
    logger.error(`Ciclo fallito: ${(err as Error).stack ?? (err as Error).message}`);
    throw err;
  } finally {
    await context?.close();
  }
}
