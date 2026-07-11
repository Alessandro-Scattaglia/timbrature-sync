import { loadConfig } from "./config/config.js";
import { createLogger } from "./logger/logger.js";
import { openBrowserSession } from "./playwright/browserSession.js";
import { ensureLoggedIn } from "./services/microsoft/entraLogin.js";

/**
 * Da lanciare a mano (npm run login) quando serve un nuovo accesso a
 * Microsoft Entra ID: apre un Edge visibile, aspetta che l'utente completi
 * il login (incluso eventuale MFA), poi salva la sessione nel profilo
 * persistente in storage/session. Da quel momento in poi `npm run start`
 * (e quindi Task Scheduler) potrà girare in headless senza intervento.
 */
async function main(): Promise<void> {
  const settings = loadConfig();
  const logger = createLogger(settings.logLevel);
  const context = await openBrowserSession({ headless: false });

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    logger.info("Apro il portale Zucchetti per il login manuale...");
    await page.goto(settings.zucchettiUrl, { waitUntil: "domcontentloaded" });
    await ensureLoggedIn(page, logger, false);
    logger.info("Login completato. Puoi chiudere questa finestra: la sessione è salvata.");
  } finally {
    await context.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
