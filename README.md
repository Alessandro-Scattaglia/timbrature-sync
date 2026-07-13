# timbrature-sync

Sincronizza automaticamente le timbrature di Infinity Zucchetti con un file
Excel locale. Il progetto puo funzionare sia con il flusso Playwright schedulato
sia con un bookmarklet da usare direttamente nella pagina Zucchetti.

Il bookmarklet legge le timbrature visibili nel DOM di Infinity Zucchetti,
incluse le griglie `*_grid_timbrus` e, come fallback, sezioni testuali tipo
`Timbrature del giorno Entrata 08:18`. I dati vengono inviati al server locale
tramite `POST /api/punches`.

## Documentazione

- [`docs/INSTALL.md`](docs/INSTALL.md) - installazione completa su Windows
  (Node.js, primo login, build, Task Scheduler)
- [`docs/EXCEL_LAYOUT.md`](docs/EXCEL_LAYOUT.md) - mapping colonne del file
  Excel e logica di calcolo

## Configurazione HTTPS per il bookmarklet

Infinity Zucchetti gira su HTTPS. Per evitare errori di Mixed Content, anche il
server locale/VM deve essere esposto in HTTPS quando il bookmarklet viene usato
da `https://saas.hrzucchetti.it`.

Genera un certificato self-signed nella cartella `certs/`:

```sh
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -subj "/CN=172.24.217.186"
```

Configura `.env` partendo da `.env.example`:

```sh
HOST=0.0.0.0
PORT=3131
SERVER_PROTOCOL=https
SSL_KEY=certs/key.pem
SSL_CERT=certs/cert.pem
CORS_ORIGIN=https://saas.hrzucchetti.it
BOOKMARKLET_SERVER=https://172.24.217.186:3131
```

Non committare certificati reali. Se generi `certs/key.pem` e `certs/cert.pem`,
devono restare fuori da git: la cartella `certs/` e ignorata, tranne
`certs/.gitkeep`.

## Avvio server e bookmarklet

Installa le dipendenze e avvia il server:

```sh
npm install
npm run serve
```

Testa il ping dal browser:

```text
https://172.24.217.186:3131/api/ping
```

Con certificato self-signed il browser potrebbe chiedere di accettare il
certificato la prima volta. Apri l'URL `/api/ping` e accetta l'avviso, se
necessario, prima di usare il bookmarklet su Zucchetti.

Genera il file di installazione del bookmarklet:

```sh
npm run generate
```

Il file viene creato in `dist/bookmarklet.html`. Aprilo nel browser e trascina
il pulsante "Sincronizza Timbrature" nella barra dei preferiti.

## Test manuale atteso

1. Avvia `npm run serve`.
2. Apri `https://172.24.217.186:3131/api/ping`.
3. Accetta l'eventuale certificato self-signed.
4. Apri Infinity Zucchetti su `https://saas.hrzucchetti.it/...`.
5. Vai nella pagina dove vedi "Timbrature del giorno" o "Visualizzazione timbrature".
6. Clicca il bookmarklet.
7. Il browser non deve mostrare errori Mixed Content.
8. Una riga tipo `Entrata 08:18` deve produrre un invio simile a:

```json
{
  "date": "2026-07-13",
  "punches": [
    { "time": "08:18", "direction": "IN" }
  ]
}
```

In caso di successo compare un toast verde. Se non vengono trovate timbrature,
il bookmarklet mostra: "Nessuna timbratura trovata. Apri la pagina con
Timbrature del giorno o Visualizzazione timbrature e riprova."

## Comandi rapidi

```sh
npm install       # installa le dipendenze
npm run login     # primo login manuale, una tantum
npm run serve     # server API HTTP/HTTPS per il bookmarklet
npm run generate  # genera dist/bookmarklet.html
npm run bookmarklet # alias storico per generare il bookmarklet
npm run build     # compila in dist/
npm start         # esegue un ciclo di sincronizzazione schedulato
npm run dev       # esecuzione in sviluppo con watch
npm test          # test del parser
npm run typecheck # controllo tipi TypeScript
```

## Struttura del progetto

```text
src/
  config/       settings.json + .env validati con Zod
  constants/    selettori DOM e mapping colonne Excel
  excel/        motore di scrittura Excel
  logger/       Winston
  playwright/   sessione browser con profilo Edge persistente
  scheduler/    orchestratore di un ciclo completo
  server/       API /api/ping e /api/punches per il bookmarklet
  services/     client e parser Zucchetti
  state/        stato di sincronizzazione, anti-duplicati
  types/        interfacce condivise
  utils/        date, retry
storage/        dati locali non versionati
certs/          solo certificati locali ignorati da git
docs/           guide
tests/          test del parser
```
