# Layout del file Excel

Il file `Timbrature_2026-2027.xlsx` (v2) ha un foglio per ogni mese, nome
esatto `"Mmm YYYY"` in italiano abbreviato (`Giu 2026`, `Lug 2026`, ...
`Giu 2027`), generato da `sheetNameForDate()` in `src/utils/date.ts`.

Ogni foglio ha 3 righe di intestazione (titolo, sottotitolo, header colonne),
poi una riga per ogni giorno lavorativo (lun–ven) del mese.

| Col | Nome | Tipo | Scritta da |
|---|---|---|---|
| A | Data | data reale `dd/mm/yyyy` | mai (già presente, usata come chiave di ricerca riga) |
| B | Giorno | testo | mai (già presente) |
| C | 🟡 T1 Entrata | ora | **timbrature-sync** (o manuale) |
| D | 🟡 T2 Uscita Pranzo | ora | **timbrature-sync** (o manuale) |
| E | 🟢 Pausa (min) | numero | manuale (default 30) |
| F | 🔵 T3 Rientro | formula | mai — si ricalcola da sola |
| G | 🔵 T4 Uscita Minima | formula | mai — si ricalcola da sola |
| H | 🟡 T5 Uscita Reale | ora | **timbrature-sync** (o manuale) — colonna NUOVA |
| I | 🔵 Ore in Azienda | formula | mai |
| J | 🔵 Ore Lavorate | formula | mai |
| K | 🔵 Stato | formula | mai |
| L | 🔵 Ore Mattina | formula | mai |
| M | 🔵 Ore Pomeriggio | formula | mai |

`src/excel/excelWriter.ts` scrive **esclusivamente** le colonne C, D, H
(vedi `EXCEL_COLUMNS` in `src/constants/excel.ts`). Tutte le formule delle
colonne F, G, I, J, K, L, M restano quelle già presenti nel file e si
ricalcolano automaticamente quando lo si riapre in Excel.

## Perché T5 e non solo T4

T4 (Uscita Minima) è sempre stata una **stima**: l'orario minimo richiesto
per completare 8 ore, calcolato da T1 + pausa. Non riflette l'orario reale
di uscita. T5 è invece il dato **reale**, preso dall'ultima timbratura OUT
della giornata dopo il rientro dalla pausa pranzo. Le colonne "Ore in
Azienda"/"Ore Lavorate" usano T5 quando presente, altrimenti ricadono su T4
(utile per i giorni ancora in corso).

## Aggiungere righe/mesi futuri

Se il file finisce (es. dopo giugno 2027) e serve continuare, basta
duplicare l'ultimo foglio, rinominarlo con il mese successivo nel formato
`"Mmm YYYY"`, e aggiornare le date/formule in colonna A/F/G/I/J/K/L/M con lo
stesso pattern delle righe esistenti (drag-fill da Excel funziona benissimo,
mantenendo i riferimenti relativi).
