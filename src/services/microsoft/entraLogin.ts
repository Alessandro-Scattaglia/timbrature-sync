import type { Page } from "playwright";
import type { Logger } from "winston";
import { MICROSOFT_LOGIN_HOST_HINTS } from "../../constants/selectors.js";

export function isLoginRequired(page: Page): boolean {
  const url = page.url();
  return MICROSOFT_LOGIN_HOST_HINTS.some((hint) => url.includes(hint));
}

/**
 * Il progetto usa un profilo Edge persistente (storage/session): se la
 * sessione Microsoft Entra ID è ancora valida, l'accesso è automatico (SSO)
 * e questa funzione non fa nulla.
 *
 * Se invece compare una pagina di login:
 *  - in modalità headless (esecuzione normale via Task Scheduler) NON si
 *    tenta nessun login automatico con credenziali: si registra l'evento nel
 *    log e si interrompe il ciclo, così al prossimo controllo del log
 *    l'utente sa che deve rilanciare `npm run login` una volta;
 *  - in modalità headed (npm run login) si aspetta che l'utente completi
 *    l'accesso manualmente nella finestra del browser.
 */
export async function ensureLoggedIn(page: Page, logger: Logger, headless: boolean): Promise<void> {
  if (!isLoginRequired(page)) return;

  if (headless) {
    throw new Error(
      "Sessione Microsoft Entra ID scaduta: rilevata pagina di login in modalità headless. " +
        'Esegui "npm run login" (finestra visibile) per accedere di nuovo, poi la sincronizzazione automatica riprenderà.'
    );
  }

  logger.warn("Pagina di login Microsoft rilevata: completa l'accesso manualmente nella finestra del browser.");
  await page.waitForURL((url) => !MICROSOFT_LOGIN_HOST_HINTS.some((hint) => url.href.includes(hint)), {
    timeout: 5 * 60_000,
  });
  logger.info("Login completato. La sessione resterà salvata nel profilo persistente.");
}
