# timbrature-sync

Sincronizza automaticamente le timbrature di Infinity Zucchetti con un file
Excel locale (anche sincronizzato via Google Drive Desktop), senza alcun
intervento manuale quotidiano.

Legge il DOM del portale con la stessa logica dell'estensione open source
[Zucchexit](https://github.com/blueberry-org/zucchexit) (riusata, non
modificata), tramite Playwright con un profilo Microsoft Edge persistente
per gestire il login Microsoft Entra ID via SSO. Scrive solo le celle di
input del file Excel (`T1`, `T2`, `T5`), senza mai toccare formule o
formattazione. Pensato per essere eseguito periodicamente da Windows Task
Scheduler, non come processo sempre attivo.

## Documentazione

- [`docs/INSTALL.md`](docs/INSTALL.md) — installazione completa su Windows
  (Node.js, primo login, build, Task Scheduler)
- [`docs/EXCEL_LAYOUT.md`](docs/EXCEL_LAYOUT.md) — mapping colonne del file
  Excel e logica di calcolo

## Comandi rapidi

```powershell
npm install       # installa le dipendenze
npm run login     # primo login manuale (Edge visibile), una tantum
npm run build     # compila in dist/
npm start         # esegue un ciclo di sincronizzazione (quello che lancerà Task Scheduler)
npm run dev       # esecuzione in sviluppo (tsx, con watch)
npm test          # test del parser
npm run typecheck # controllo tipi TypeScript
```

## Struttura del progetto

```
src/
  config/       settings.json + .env validati con Zod
  constants/    selettori DOM (riusati da Zucchexit) e mapping colonne Excel
  excel/        motore di scrittura Excel (solo celle di input)
  logger/       Winston (console + storage/logs/sync.log)
  playwright/   sessione browser con profilo Edge persistente
  scheduler/    orchestratore di un ciclo completo
  services/
    microsoft/  rilevamento/gestione login Entra ID
    zucchetti/  client di scraping + parser puro delle timbrature
  state/        stato di sincronizzazione, anti-duplicati
  types/        interfacce condivise
  utils/        date, retry
  index.ts      entry point (lanciato da Task Scheduler)
  login.ts      entry point per il login manuale una tantum
storage/        dati locali non versionati (sessione, log, stato)
docs/           guide
tests/          test del parser
```
