import type { Page } from "playwright";
import type { Logger } from "winston";
import { SELECTORS } from "../../constants/selectors.js";
import type { Timbratura } from "../../types/timbratura.js";

interface RawRow {
  time: string | null;
  direction: "IN" | "OUT";
}

export class ZucchettiClient {
  constructor(
    private readonly page: Page,
    private readonly zucchettiUrl: string,
    private readonly logger: Logger
  ) {}

  /** Legge le timbrature del giorno corrente dalla tabella nell'iframe "Main". */
  async scrapeToday(): Promise<Timbratura[]> {
    this.logger.debug(`Navigo verso ${this.zucchettiUrl}`);
    await this.page.goto(this.zucchettiUrl, { waitUntil: "networkidle", timeout: 60_000 });

    const frame = this.page.frame({ name: SELECTORS.mainFrameName });
    if (!frame) {
      throw new Error(
        `Iframe "${SELECTORS.mainFrameName}" non trovato: sessione scaduta o layout del portale cambiato.`
      );
    }

    await frame.waitForSelector(SELECTORS.timbratureTable, { timeout: 30_000 });

    const rows: RawRow[] = await frame.$$eval(
      `${SELECTORS.timbratureTable} ${SELECTORS.timbratureRow}`,
      (trs) =>
        trs.map((row) => {
          const timeCell = row.querySelectorAll(":nth-child(3)")[0] as HTMLElement | undefined;
          const timeText = timeCell?.innerText?.trim() ?? null;
          const isIn = row.querySelectorAll(".blue").length > 0;
          return { time: timeText, direction: isIn ? "IN" : "OUT" };
        })
    );

    const punches: Timbratura[] = rows
      .filter((r): r is { time: string; direction: "IN" | "OUT" } => Boolean(r.time))
      .map((r) => ({ time: r.time, direction: r.direction }));

    this.logger.info(`Timbrature lette dal portale: ${punches.length}`);
    return punches;
  }
}
