# SETUP.md — Guida di installazione Timbrature Sync

Tempo stimato: 15 minuti totali, una volta sola.

---

## PARTE 1 — Google Apps Script (5 minuti)

### 1. Crea il progetto Apps Script

1. Vai su **https://script.google.com**
2. Clicca **"Nuovo progetto"**
3. Rinomina il progetto in alto: `Timbrature Sync`
4. Nella scheda `Code.gs`, **cancella tutto** il contenuto di default
5. **Incolla** tutto il contenuto del file `Code.gs` di questa repo
6. Salva con **Ctrl+S**

---

### 2. Crea il Google Sheet (esegui `setupSpreadsheet`)

1. Nella barra del menu in alto, accanto a "Esegui" c'è un menu a tendina
   con il nome della funzione: assicurati che sia selezionato **`setupSpreadsheet`**
2. Clicca **"Esegui"** (▶️)
3. Apparirà una richiesta di permessi → clicca **"Rivedi autorizzazioni"**
4. Scegli il tuo account Google → clicca **"Avanzate"** → **"Vai a Timbrature Sync"**
5. Clicca **"Consenti"**
6. Lo script creerà un Google Sheet chiamato `Timbrature 2026-2027` nel tuo Drive
7. Apparirà un popup con l'URL del foglio → aprilo e verifica che ci siano
   i fogli mensili da `Giu 2026` a `Giu 2027`

---

### 3. Pubblica come Web App

1. In alto a destra clicca **"Distribuisci"** → **"Nuova distribuzione"**
2. Clicca l'icona ⚙️ a fianco di "Tipo" → seleziona **"App web"**
3. Imposta:
   - **Descrizione**: `Timbrature Sync v1`
   - **Esegui come**: `Me (tuoaccount@gmail.com)`
   - **Chi ha accesso**: **`Chiunque`** ← importante, altrimenti l'estensione
     non riesce a inviare i dati
4. Clicca **"Distribuisci"**
5. Copia l'**URL dell'app web** — ha questa forma:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
   **Conserva questo URL**, ti servirà nel passo successivo.

> **Nota**: se in futuro modifichi il codice `Code.gs`, devi fare
> **"Distribuisci" → "Gestisci distribuzioni" → "Modifica" → nuova versione**
> altrimenti le modifiche non saranno attive sull'URL pubblico.

---

## PARTE 2 — Estensione Chrome (5 minuti)

### 4. Inserisci l'URL nell'estensione

1. Apri il file `content.js` della cartella dell'estensione
2. Trova la riga:
   ```javascript
   const APPS_SCRIPT_URL = "INSERISCI_QUI_L_URL_APPS_SCRIPT";
   ```
3. Sostituisci `INSERISCI_QUI_L_URL_APPS_SCRIPT` con l'URL copiato al passo 3:
   ```javascript
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Salva il file

### 5. Carica l'estensione in Edge/Chrome

1. Apri Edge o Chrome
2. Vai su `edge://extensions` (o `chrome://extensions`)
3. Attiva **"Modalità sviluppatore"** (in alto a destra)
4. Clicca **"Carica decompresso"**
5. Seleziona la cartella dell'estensione (quella con `manifest.json`)
6. L'estensione appare nella lista con il nome **Zucchexit**

---

## PARTE 3 — Verifica (2 minuti)

### 6. Test finale

1. Apri il portale Zucchetti e aspetta che la pagina si carichi
2. Trovi un pulsante blu **"🔄 Sincronizza Timbrature"** sopra la tabella
3. Clicca il pulsante
4. Deve apparire un toast verde tipo:
   ```
   ✅ Sincronizzato!
   T1: 08:16  T2: 13:00
   ```
5. Apri Google Sheets sul telefono → il foglio `Lug 2026` (o il mese corrente)
   deve avere gli orari nella riga di oggi

### 7. Sync automatico

Da questo momento l'estensione:
- Sincronizza automaticamente ogni volta che la tabella timbrature cambia
  (MutationObserver attivo in background)
- Sincronizza in modo silenzioso all'apertura della pagina
- Usa il pulsante solo se vuoi forzare un aggiornamento manuale

---

## DOMANDE FREQUENTI

**"URL non configurato" appare cliccando il pulsante**
→ Hai saltato il passo 4. Inserisci l'URL in `content.js` e ricarica l'estensione.

**"Chi ha accesso" su "Solo io" e il sync non funziona**
→ Cambia a "Chiunque" nelle impostazioni di distribuzione e ridistribuisci.

**"Riga per DD/MM/YYYY non trovata"**
→ Il foglio del mese esiste ma non ha la riga di quel giorno.
   Apri il Sheet e controlla che la riga ci sia (i giorni festivi non vengono
   generati automaticamente dal setup).

**Voglio vedere il log di cosa è stato scritto**
→ In Apps Script vai su **Esecuzioni** (icona ▶ nel menu laterale) per vedere
   tutti i log delle chiamate ricevute.
