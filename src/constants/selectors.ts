/**
 * Selettori identici a quelli usati da Zucchexit (content.js) per leggere la
 * tabella delle timbrature dall'iframe "Main" del portale Infinity Zucchetti.
 * Se Zucchetti cambia il layout del portale, questo è il primo posto da
 * controllare/aggiornare.
 */
export const SELECTORS = {
  mainFrameName: "Main",
  timbratureTable: `table[id$='_grid_timbrus']`,
  timbratureRow: `tbody>tr[lookupcells="1"]`,
} as const;

export const MICROSOFT_LOGIN_HOST_HINTS = [
  "login.microsoftonline.com",
  "login.microsoft.com",
] as const;
