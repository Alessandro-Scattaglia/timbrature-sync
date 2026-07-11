# Installazione su Windows

## 0. Prerequisiti

- **Node.js** LTS (≥ 20) — https://nodejs.org
- **Microsoft Edge** già installato (di norma già presente su Windows)
- **Google Drive per desktop** già configurato, con la cartella che contiene
  il file Excel sincronizzata localmente (es. `G:\Il mio Drive\Timbrature\`)

## 1. Clona/scarica il progetto

```powershell
cd C:\
git clone https://github.com/Alessandro-Scattaglia/timbrature-sync.git
cd timbrature-sync
```

(oppure scompatta lo zip nella cartella `C:\timbrature-sync`)

## 2. Installa le dipendenze

```powershell
npm install
```

Non serve scaricare browser aggiuntivi: il progetto usa Edge già presente
sul PC tramite `channel: "msedge"` di Playwright.

## 3. Configura `settings.json`

Apri `settings.json` e imposta:

```json
{
    "zucchettiUrl": "https://saas.hrzucchetti.it/<TUO-DOMINIO>/jsp/home.jsp",
    "excelPath": "G:\\Il mio Drive\\Timbrature\\Timbrature_2026-2027.xlsx",
    "checkIntervalMinutes": 10,
    "headless": true,
    "logLevel": "info"
}
```

- `zucchettiUrl`: l'URL esatto della tua istanza (lo trovi in barra
  indirizzi dopo il login, prima di `/jsp/home.jsp`).
- `excelPath`: percorso Windows **completo** del file, dentro la cartella
  sincronizzata da Google Drive Desktop (per l'app è un file locale
  qualunque: Drive lo risincronizza da solo appena viene salvato).
- `checkIntervalMinutes`: usato solo per generare il trigger del Task
  Scheduler al punto 6 — l'app non fa polling interno.

Copia anche `.env.example` in `.env` (va bene lasciarlo com'è, a meno che
tu non usi un canale diverso da `msedge`).

## 4. Primo login (una tantum)

```powershell
npm run login
```

Si apre un Edge visibile: fai login con Microsoft Entra ID (utente,
password, eventuale MFA). Alla fine la sessione viene salvata in
`storage/session/` (profilo Edge persistente, escluso da git). Questo passo
va ripetuto **solo** quando la sessione scade (lo capirai dal log, vedi
punto 7).

## 5. Build

```powershell
npm run build
```

Genera `dist/index.mjs` e `dist/login.mjs`. Usiamo la build compilata (non
`tsx`) per le esecuzioni schedulate: più leggera e più stabile nel tempo.

## 6. Crea l'attività pianificata (Task Scheduler)

1. Apri **Utilità di pianificazione** (Task Scheduler) di Windows.
2. **Crea attività** (non "Crea attività di base", per avere tutte le opzioni).
3. **Generale**:
   - Nome: `TimbratureSync`
   - "Esegui indipendentemente dalla connessione dell'utente" ✅ (così gira
     anche a schermo bloccato)
   - "Esegui con i privilegi più elevati" non necessario
4. **Trigger** → Nuovo:
   - Giornaliero, ripeti ogni giorno
   - "Ripeti l'attività ogni" → `10 minuti` (o il valore di
     `checkIntervalMinutes`), "per una durata di" → `1 giorno`
5. **Azioni** → Nuovo:
   - Programma/script: `node.exe` (percorso completo, es.
     `C:\Program Files\nodejs\node.exe`)
   - Aggiungi argomenti: `dist\index.mjs`
   - Inizia in: `C:\timbrature-sync` (la cartella del progetto — **fondamentale**,
     altrimenti non trova `settings.json`)
6. **Condizioni**: disattiva "Avvia l'attività solo se il computer è
   alimentato a corrente CA" se usi un portatile e vuoi che giri anche a
   batteria.
7. Salva. Ti verrà chiesta la password dell'account Windows (necessaria per
   "esegui indipendentemente dalla connessione dell'utente").

Da questo momento Windows lancerà `node dist\index.js` ogni N minuti, in
background, senza aprire finestre (headless: true).

## 7. Come sapere se qualcosa non va

Tutto viene loggato in `storage\logs\sync.log` (oltre che a console se lanci
a mano). I casi più comuni:

- **`Sessione Microsoft Entra ID scaduta`** → rilancia `npm run login`.
- **`File Excel non trovato`** → controlla `excelPath` in `settings.json`
  e che Google Drive Desktop abbia scaricato il file localmente (non solo
  "disponibile online").
- **Errori ripetuti di scrittura Excel** → probabile file aperto in Excel
  sul tuo PC mentre lo script prova a scriverci: chiudilo, oppure lascia
  fare ai 5 tentativi automatici con backoff.

## 8. Aggiornare il progetto in futuro

```powershell
git pull
npm install
npm run build
```

Il Task Scheduler continuerà a puntare a `dist\index.mjs`, che verrà
sovrascritto dalla build.
