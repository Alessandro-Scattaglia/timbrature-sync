// ════════════════════════════════════════════════════════════════════════════
// Timbrature Sync — Google Apps Script (Code.gs)
// Incolla questo file su script.google.com, poi segui SETUP.md
// ════════════════════════════════════════════════════════════════════════════

const MONTHS_IT  = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
const DAYS_IT    = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const HEADER_ROWS = 3;

// Colonne (1-indexed, come in Sheets)
const COL = { DATA:1, GIORNO:2, T1:3, T2:4, PAUSA:5, T3:6, T4:7, T5:8,
               ORE_AZ:9, ORE_LAV:10, STATO:11, MATTINA:12, POMERIGGIO:13 };

// ── Recupera il foglio di calcolo dal suo ID (salvato nelle proprietà) ─────
function getSpreadsheet() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error(
    'SPREADSHEET_ID non configurato. Esegui prima setupSpreadsheet() dalla barra degli strumenti.'
  );
  return SpreadsheetApp.openById(id);
}

// ── Converte "HH:MM" in frazione di giorno (formato nativo di Sheets) ───────
function timeToValue(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m) / 1440;
}

// ── Formatta una data come "dd/MM/yyyy" (fuso Roma) ─────────────────────────
function fmtDate(date) {
  return Utilities.formatDate(date, "Europe/Rome", "dd/MM/yyyy");
}

// ── Risposta JSON ────────────────────────────────────────────────────────────
function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════════════════════════
// doGet — health check (apri l'URL nel browser per verificare che funzioni)
// ════════════════════════════════════════════════════════════════════════════
function doGet() {
  return jsonOut({ ok: true, message: "Timbrature Sync attivo", ts: new Date().toISOString() });
}

// ════════════════════════════════════════════════════════════════════════════
// doPost — riceve i dati dall'estensione Chrome e aggiorna il foglio
// ════════════════════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const { date, t1, t2, t5 } = JSON.parse(e.postData.contents);
    if (!date) return jsonOut({ ok: false, error: "Campo 'date' mancante (YYYY-MM-DD)" });

    const d         = new Date(date + "T12:00:00");
    const sheetName = MONTHS_IT[d.getMonth()] + " " + d.getFullYear();
    const ss        = getSpreadsheet();
    let   sheet     = ss.getSheetByName(sheetName);

    // Se il foglio del mese non esiste ancora, lo crea on-the-fly
    if (!sheet) sheet = createMonthSheet(ss, d);

    // Cerca la riga della data richiesta
    const dateStr  = fmtDate(d);
    const allVals  = sheet.getDataRange().getValues();
    let   targetRow = -1;

    for (let i = HEADER_ROWS; i < allVals.length; i++) {
      const cell    = allVals[i][COL.DATA - 1];
      const cellStr = cell instanceof Date ? fmtDate(cell) : String(cell);
      if (cellStr === dateStr) { targetRow = i + 1; break; }
    }

    if (targetRow === -1) return jsonOut({
      ok: false,
      error: `Riga per ${dateStr} non trovata nel foglio "${sheetName}"`
    });

    // Scrive SOLO le colonne di input (mai formule o stili)
    const written = {};
    if (t1) {
      sheet.getRange(targetRow, COL.T1).setValue(timeToValue(t1)).setNumberFormat("HH:mm");
      written.t1 = t1;
    }
    if (t2) {
      sheet.getRange(targetRow, COL.T2).setValue(timeToValue(t2)).setNumberFormat("HH:mm");
      written.t2 = t2;
    }
    if (t5) {
      sheet.getRange(targetRow, COL.T5).setValue(timeToValue(t5)).setNumberFormat("HH:mm");
      written.t5 = t5;
    }

    if (Object.keys(written).length === 0) {
      return jsonOut({ ok: true, message: "Nessun valore nuovo da scrivere" });
    }

    return jsonOut({ ok: true, written });

  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// setupSpreadsheet — eseguire UNA SOLA VOLTA dalla barra strumenti di Script
// Crea il Google Sheet con tutti i fogli mensili (Giu 2026 → Giu 2027),
// intestazioni, colori e formule. Salva l'ID nelle proprietà dello script.
// ════════════════════════════════════════════════════════════════════════════
function setupSpreadsheet() {
  const NAME = "Timbrature 2026-2027";

  // Crea un nuovo foglio di calcolo oppure apri quello esistente se già creato
  const existing = DriveApp.getFilesByName(NAME);
  let ss;
  if (existing.hasNext()) {
    ss = SpreadsheetApp.openById(existing.next().getId());
    Logger.log("Foglio già esistente, aggiorno la struttura.");
  } else {
    ss = SpreadsheetApp.create(NAME);
    Logger.log("Creato nuovo foglio: " + NAME);
  }

  // Salva l'ID nelle proprietà per uso futuro
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  Logger.log("SPREADSHEET_ID salvato: " + ss.getId());

  // Range di mesi da creare: Giu 2026 → Giu 2027
  const months = [
    { year: 2026, month: 5, startDay: 16 },  // Giugno 2026 (mese 5, 0-indexed)
    { year: 2026, month: 6  },
    { year: 2026, month: 7  },
    { year: 2026, month: 8  },
    { year: 2026, month: 9  },
    { year: 2026, month: 10 },
    { year: 2026, month: 11 },
    { year: 2027, month: 0  },
    { year: 2027, month: 1  },
    { year: 2027, month: 2  },
    { year: 2027, month: 3  },
    { year: 2027, month: 4  },
    { year: 2027, month: 5, endDay: 14 },     // Giugno 2027
  ];

  // Rimuovi il foglio default "Foglio1" se presente
  const defaultSheet = ss.getSheetByName("Foglio1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }

  months.forEach(({ year, month, startDay, endDay }) => {
    const sheetName = MONTHS_IT[month] + " " + year;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    } else {
      sheet.clearContents();
    }
    buildMonthSheet(sheet, year, month, startDay || 1, endDay);
  });

  // Rimuovi l'eventuale foglio vuoto rimasto
  const blank = ss.getSheetByName("Foglio1") || ss.getSheetByName("Sheet1");
  if (blank) try { ss.deleteSheet(blank); } catch(_) {}

  Logger.log("Setup completato. URL: " + ss.getUrl());
  SpreadsheetApp.getUi().alert(
    "✅ Setup completato!\n\n" +
    "Apri il foglio e verifica che abbia i mesi da Giu 2026 a Giu 2027.\n\n" +
    "URL: " + ss.getUrl()
  );
}

// ── Costruisce un foglio mensile con intestazioni e righe dei giorni ─────────
function buildMonthSheet(sheet, year, month, startDay, endDay) {
  const DAYS_IN_MONTH = new Date(year, month + 1, 0).getDate();
  const actualEnd     = endDay || DAYS_IN_MONTH;

  const mName = MONTHS_IT[month];
  const mFull = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"][month];

  // Riga 1: titolo
  sheet.getRange(1, 1, 1, 13).merge()
    .setValue(`Registro Timbrature  —  ${mFull} ${year}`)
    .setBackground("#1F3864").setFontColor("#FFFFFF")
    .setFontSize(13).setFontWeight("bold")
    .setVerticalAlignment("middle").setHorizontalAlignment("left");
  sheet.setRowHeight(1, 32);

  // Riga 2: sottotitolo
  sheet.getRange(2, 1, 1, 13).merge()
    .setValue("🟡 Entrata/Uscita  |  🟢 Pausa (min)  |  🔵 Colonne calcolate — non modificare")
    .setBackground("#e8eef7").setFontColor("#595959").setFontSize(9).setFontStyle("italic");
  sheet.setRowHeight(2, 18);

  // Riga 3: intestazioni
  const headers = [
    "Data","Giorno","🟡 T1\nEntrata","🟡 T2\nUscita Pranzo","🟢 Pausa\n(min)",
    "🔵 T3\nRientro","🔵 T4\nUscita Min.","🟡 T5\nUscita Reale",
    "Ore in\nAzienda","Ore\nLavorate","Stato","Ore\nMattina","Ore\nPomeriggio"
  ];
  const hRange = sheet.getRange(3, 1, 1, 13);
  hRange.setValues([headers])
    .setBackground("#2F5496").setFontColor("#FFFFFF")
    .setFontSize(9).setFontWeight("bold")
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(3, 40);

  // Larghezze colonne
  const widths = [90, 85, 65, 90, 58, 65, 75, 82, 72, 72, 58, 68, 78];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

  // Righe dei giorni lavorativi
  let r = HEADER_ROWS + 1;
  for (let d = startDay; d <= actualEnd; d++) {
    const date = new Date(year, month, d);
    const dow  = date.getDay();
    if (dow === 0 || dow === 6) continue; // salta sabato e domenica

    // Colonna A: data
    sheet.getRange(r, COL.DATA).setValue(date).setNumberFormat("dd/MM/yyyy");

    // Colonna B: giorno
    sheet.getRange(r, COL.GIORNO).setValue(DAYS_IT[dow]);

    // Colonna E: pausa default 30
    sheet.getRange(r, COL.PAUSA).setValue(30).setHorizontalAlignment("center");

    // Colonne formule (🔵)
    sheet.getRange(r, COL.T3).setFormula(
      `=IF(OR(D${r}="",E${r}=""),"",D${r}+E${r}/1440)`
    ).setNumberFormat("HH:mm");
    sheet.getRange(r, COL.T4).setFormula(
      `=IF(C${r}="","",C${r}+TIME(8,0,0)+E${r}/1440)`
    ).setNumberFormat("HH:mm");
    sheet.getRange(r, COL.ORE_AZ).setFormula(
      `=IF(C${r}="","",IF(H${r}<>"",H${r},G${r})-C${r})`
    ).setNumberFormat("[h]:mm");
    sheet.getRange(r, COL.ORE_LAV).setFormula(
      `=IF(C${r}="","",IF(H${r}<>"",H${r},G${r})-C${r}-E${r}/1440)`
    ).setNumberFormat("[h]:mm");
    sheet.getRange(r, COL.STATO).setFormula(
      `=IF(C${r}="","—",IF(AND(J${r}>=TIME(8,0,0),E${r}>=30),"✅ OK","⚠️"))`
    ).setHorizontalAlignment("center");
    sheet.getRange(r, COL.MATTINA).setFormula(
      `=IF(OR(C${r}="",D${r}=""),"",D${r}-C${r})`
    ).setNumberFormat("[h]:mm");
    sheet.getRange(r, COL.POMERIGGIO).setFormula(
      `=IF(F${r}="","",IF(H${r}<>"",H${r}-F${r},G${r}-F${r}))`
    ).setNumberFormat("[h]:mm");

    r++;
  }

  // Blocca le prime 3 righe (intestazioni)
  sheet.setFrozenRows(HEADER_ROWS);
}

// ── Crea un foglio mensile on-the-fly (usato da doPost per mesi futuri) ─────
function createMonthSheet(ss, date) {
  const month = date.getMonth();
  const year  = date.getFullYear();
  const sheet = ss.insertSheet(MONTHS_IT[month] + " " + year);
  buildMonthSheet(sheet, year, month, 1, null);
  return sheet;
}

function setMySpreadsheet() {
  PropertiesService.getScriptProperties()
    .setProperty("SPREADSHEET_ID", "1RV0hURRUERh2Dp7emprj02N_Rgugx2I6IdMLxmO1DLQ");
}

function checkProperty() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  Logger.log("SPREADSHEET_ID attuale: " + id);
}
