export const MONTHS_IT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
] as const;

// Colonne del file Timbrature (1-indexed, come in ExcelJS/openpyxl).
// Le colonne 6,7,9,10,11,12,13 contengono formule e non vanno MAI scritte.
export const EXCEL_COLUMNS = {
  DATA: 1,
  GIORNO: 2,
  T1: 3,
  T2: 4,
  PAUSA: 5,
  T3_CALC: 6,
  T4_CALC: 7,
  T5: 8,
  ORE_AZIENDA_CALC: 9,
  ORE_LAVORATE_CALC: 10,
  STATO_CALC: 11,
  ORE_MATTINA_CALC: 12,
  ORE_POMERIGGIO_CALC: 13,
} as const;

// Righe di intestazione da saltare quando si cerca la riga di una data
export const HEADER_ROWS = 3;
