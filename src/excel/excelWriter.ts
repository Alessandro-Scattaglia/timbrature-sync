import fs from "node:fs";
import ExcelJS from "exceljs";
import type { Logger } from "winston";
import { EXCEL_COLUMNS, HEADER_ROWS } from "../constants/excel.js";
import { sheetNameForDate, formatDateIt } from "../utils/date.js";
import { withRetry } from "../utils/retry.js";

export interface CellUpdate {
  t1?: string;
  t2?: string;
  t5?: string;
}

/** "08:16" -> Date epoch con solo ore/minuti, formato richiesto da ExcelJS per celle orario */
function toExcelTime(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1899, 11, 30, h, m, 0));
}

export class ExcelWriter {
  constructor(
    private readonly excelPath: string,
    private readonly logger: Logger
  ) {}

  async updateDay(date: Date, values: CellUpdate): Promise<void> {
    if (!values.t1 && !values.t2 && !values.t5) {
      this.logger.debug("Nessun valore nuovo da scrivere, salto la scrittura su Excel.");
      return;
    }

    await withRetry(() => this.writeOnce(date, values), {
      retries: 5,
      delayMs: 3000,
      onRetry: (attempt, err) =>
        this.logger.warn(
          `Tentativo ${attempt}/5 di scrittura Excel fallito (probabile lock temporaneo, es. sync di Google Drive in corso): ${
            (err as Error).message
          }`
        ),
    });
  }

  private async writeOnce(date: Date, values: CellUpdate): Promise<void> {
    if (!fs.existsSync(this.excelPath)) {
      throw new Error(`File Excel non trovato: ${this.excelPath}`);
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(this.excelPath);

    const sheetName = sheetNameForDate(date);
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      throw new Error(`Foglio "${sheetName}" non trovato nel file Excel. Controlla che esista già.`);
    }

    const dateStr = formatDateIt(date);
    let targetRow: ExcelJS.Row | undefined;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= HEADER_ROWS) return;
      const cellValue = row.getCell(EXCEL_COLUMNS.DATA).value;
      const cellText = cellValue instanceof Date ? formatDateIt(cellValue) : String(cellValue ?? "").trim();
      if (cellText === dateStr) targetRow = row;
    });

    if (!targetRow) {
      throw new Error(`Riga per la data ${dateStr} non trovata nel foglio "${sheetName}".`);
    }

    // Scriviamo ESCLUSIVAMENTE le colonne di input (🟡 T1/T2/T5). Le colonne
    // calcolate (🔵) e la formattazione non vengono mai toccate: le formule
    // già presenti nel file si ricalcolano da sole quando Excel riapre il file.
    if (values.t1) {
      const cell = targetRow.getCell(EXCEL_COLUMNS.T1);
      cell.value = toExcelTime(values.t1);
      cell.numFmt = "hh:mm";
    }
    if (values.t2) {
      const cell = targetRow.getCell(EXCEL_COLUMNS.T2);
      cell.value = toExcelTime(values.t2);
      cell.numFmt = "hh:mm";
    }
    if (values.t5) {
      const cell = targetRow.getCell(EXCEL_COLUMNS.T5);
      cell.value = toExcelTime(values.t5);
      cell.numFmt = "hh:mm";
    }

    targetRow.commit();
    await workbook.xlsx.writeFile(this.excelPath);
    this.logger.info(`Excel aggiornato → ${sheetName} / ${dateStr}: ${JSON.stringify(values)}`);
  }
}
