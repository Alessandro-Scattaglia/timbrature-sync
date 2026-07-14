function nearestMultipleOf15(num) {
  // Calcola il multiplo di 15 più vicino
  let lowerMultiple = Math.floor(num / 15) * 15;
  let upperMultiple = Math.ceil(num / 15) * 15;

  if (lowerMultiple == 0) {
    lowerMultiple = upperMultiple;
  }

  // Restituisce il multiplo più vicino
  return (num - lowerMultiple < upperMultiple - num) ? lowerMultiple : upperMultiple;
}

function getExitTime() {
  let messages = [];
  let mainTable = frame.querySelector(`table[id$='_grid_timbrus']`);

  if (mainTable) {
    let isItalian = frame.querySelector(`[id$='_11_portlet_title_lbl_title_openclosetbl']`).innerText === 'Visualizzazione timbrature';

    let resLessThan30Min = isItalian ? 'Hai fatto {0} minuti di pausa pranzo.' : `You had a {0} minutes lunch break.`;
    let ressMoreThan1Hour = isItalian ? 'Hai fatto {0} minuti di pausa pranzo! Orario di uscita calcolato su 60 minuti di pausa ma saranno conteggiati {1} minuti di minor presenza.' :
      `You had a {0} minutes lunch break! Time of exit calculated on 60 minutes of lunch break but there will be {1} minutes of lower attendance.`;
    let resROL = isItalian ? `L'orario di uscita è calcolato su {0} ore di ROL.` :
      `Time of exit calculated on {0} hours of ROL.`;
    let resLunchBreak = isItalian ? `L'orario di uscita è calcolato su {0} minuti di pausa pranzo.` :
      `Time of exit calculated on {0} minutes of lunch break.`;
    let resIsEstimation = isItalian ? `L'orario di uscita definitivo verrà mostrato dopo la pausa pranzo.` :
      `The final time of exit will be shown after the lunch break.`
    let resBefore730 = isItalian ? `L'orario di ingresso usato per il calcolo è 7:30.` :
      `The time of entry used for the calculation is 7:30.`;
    let resAfter14 = isItalian ? `Sei tornato da pausa pranzo dopo le 14:00, dovrai prendere ROL!` : `You've exceeded the end of the lunch break (14:00), take a ROL!`;
    var timbrature = Array.from(mainTable.querySelectorAll('tbody>tr[lookupcells="1"]')).map((x) => {
      var time = x.querySelectorAll(':nth-child(3)')[0].innerText;
      var date = new Date();
      date.setHours(time.substring(0, 2), time.substring(3), 0, 0)

      return {
        direction: x.querySelectorAll('.blue').length ? 'IN' : 'OUT',
        time: date
      }
    });

    if (timbrature && timbrature.length) {
      let i = 0;
      let found = false;
      let startTime;
      let endTime;
      let rolTime = 0;
      let lunchTimeMinutes = 0;

      let minDate = new Date();
      minDate.setHours(7, 30, 0, 0);

      let pausaStart = new Date();
      pausaStart.setHours(12, 0, 0, 0);

      let pausaEnd = new Date();
      pausaEnd.setHours(14, 0, 0, 0);

      let maxIngresso = new Date();
      maxIngresso.setHours(10, 0, 0, 0);

      //Cerca la data di inizio
      do {
        if (timbrature[i].direction === 'IN') {

          // Se ho timbrato prima delle 7:30, imposto 7:30 come orario base
          if (timbrature[i].time < minDate) {
            messages.push({ icon: 'warn', message: resBefore730 });
            startTime = minDate;
          } else {
            startTime = timbrature[i].time;
          }

          found = true;
        } else {
          i++;
        }
      } while (!found && i < timbrature.length);

      //Se ho trovato la data di inizio...
      if (startTime) {
        //Se ho bollato l'uscita...
        if (timbrature.slice(i).some(x => x.direction === 'OUT')) {
          found = false;
          let inizioPausaPranzo;
          let finePausaPranzo;

          //Cerca la data di uscita (inizio pausa pranzo)
          do {
            if (timbrature[i].direction === 'OUT' && timbrature[i].time >= pausaStart) {
              inizioPausaPranzo = timbrature[i].time;
              found = true;
            }
            else {
              i++;
            }
          } while (!found && i < timbrature.length);

          if (inizioPausaPranzo) {
            found = false;

            //Cerca la data di rientro (fine pausa pranzo)
            do {
              if (timbrature[i].direction === 'IN') {
                finePausaPranzo = timbrature[i].time;

                if (finePausaPranzo > pausaEnd) {
                  messages.push({ icon: 'error', message: resAfter14 });
                }

                let diff = finePausaPranzo - inizioPausaPranzo;
                // Se ho sforato l'ora...
                if (diff > 3600000) {
                  messages.push({ icon: 'error', message: ressMoreThan1Hour.format(Math.floor(diff / 60000), Math.floor(nearestMultipleOf15(Math.floor((diff - 3600000) / 60000)))) });

                  // Metto la pausa a 1 ora
                  finePausaPranzo = new Date(inizioPausaPranzo.getTime());
                  finePausaPranzo.setHours(finePausaPranzo.getHours() + 1);
                } else {
                  finePausaPranzo = timbrature[i].time;
                }

                found = true;
              } else {
                i++;
              }
            } while (!found && i < timbrature.length);
          }

          // Se so quando sono rientrato dalla pausa pranzo...
          if (finePausaPranzo) {
            endTime = new Date(startTime.getTime());
            let workHours = 8;

            if (startTime > maxIngresso) {
              // Ho preso o devo prendere ROL
              let differenza = startTime - maxIngresso;
              rolTime = (differenza / (1000 * 60 * 60)) % 24;
              rolTime = rolTime % 1 != 0 ? Math.floor(rolTime) + 1 : Math.floor(rolTime);
              messages.push({ icon: 'warn', message: resROL.format(rolTime) });

              workHours -= rolTime;
            }

            endTime.setHours(endTime.getHours() + workHours);
            var durataPausaPranzo = finePausaPranzo - inizioPausaPranzo;

            // Se ho fatto meno di mezz'ora di pausa pranzo...
            if (durataPausaPranzo < 1800000) {
              messages.push({ icon: 'warn', message: resLessThan30Min.format(Math.floor(durataPausaPranzo / 60000)) });
              //Imposto 30 minuti come durata
              durataPausaPranzo = 1800000;
            }

            endTime.setMilliseconds(endTime.getMilliseconds() + durataPausaPranzo);
            let lunchTimeMinutes = Math.floor(durataPausaPranzo / 60000);
            messages.push({ icon: 'info', message: resLunchBreak.format(lunchTimeMinutes) });
            return { date: endTime, lunchTimeMinutes: lunchTimeMinutes, rol: rolTime, isEstimation: false, messages };
          }
        }

        endTime = new Date(startTime.getTime());
        let workHours = 8;

        if (startTime > maxIngresso) {
          // Ho preso o devo prendere ROL
          let differenza = startTime - maxIngresso;
          rolTime = Math.round((differenza / (1000 * 60 * 60)) % 24);
          messages.push({ icon: 'warn', message: resROL.format(rolTime) });

          workHours -= rolTime;
        }

        endTime.setHours(endTime.getHours() + workHours);
        if (startTime <= pausaStart) {
          //Calcola su mezz'ora di pausa
          lunchTimeMinutes = 30;
          endTime.setMinutes(endTime.getMinutes() + lunchTimeMinutes);
          messages.push({ icon: 'warn', message: resIsEstimation });
          return { date: endTime, lunchTimeMinutes: lunchTimeMinutes, rol: rolTime, isEstimation: true, messages };
        }
      }

      return { date: endTime, lunchTimeMinutes: lunchTimeMinutes, rol: rolTime, isEstimation: false, messages };
    }
  }
}

function showExitTime() {
  let exitTime = getExitTime();

  if (exitTime) {

    let res_remainingTime;
    let res_timeOfExit;

    if (frame.querySelector(`[id$='_11_portlet_title_lbl_title_openclosetbl']`).innerText === 'Visualizzazione timbrature') {
      res_remainingTime = 'Tempo residuo';
      res_timeOfExit = 'Orario di uscita';

    } else {
      res_remainingTime = 'Remaining time';
      res_timeOfExit = 'Time of exit';
    }

    const template = document.createElement("template");
    template.innerHTML =
      `<style>
                 .x-lg-text {
                     font-size: 40px;         
                 }
 
                 .x-md-text {
                     font-size: 25px;
                 }

                 .x-md-text > span {
                    text-align:left;
                    display: inline-block;
                 }

                 .x-md-text > .x-bold {
                    margin-right: 5px;
                 }

                 .x-lg-text, .x-md-text {
                    font-family: Proxima Nova !important;
                    color: #343434;
                 }
 
                 .x-bold {
                     font-weight: 600;
                 }
 
                 .x-flex {
                     display: flex;
                     justify-content: center;
                 }
 
                 .x-flex-item {
                    display: flex;
                    justify-content: center;
                    align-items: start;
                    flex-direction: column;
                    flex: 50%;
                    align-items: center;
                 }

                 .x-flex-item.single {
                    align-items: center;
                    margin: 0;
                 }
 
                 .x-title {
                     font-size: 14px !important;
                     font-family: Proxima Nova !important;
                     font-weight: 600 !important;
                     text-shadow: none !important;
                     color: #777 !important;
                     text-align: center !important;
                     display: flex;
                     justify-content: center;
                     align-items: center;
                 }

                 .x-messages {
                    margin: 0px 0px 5px 0px;
                 }

                 .x-message {
                    padding: 4px;
                    border-bottom: 1px solid #e3e3e3;
                    font-family: Proxima Nova;
                    font-weight: 300;
                    font-size: 13px;
                    color: #222;
                    text-align: left;
                 }

                 .x-message:last-child {
                    border-bottom: none;
                 }

                 .x-icon {
                    width: 8px;
                    height: 8px;
                    border-radius: 50px;
                    margin-right: 5px;
                    display: inline-block;
                 }

                 .x-warn {
                    background: #FFA500;
                 }

                 .x-info {
                    background: #35c464;
                    font-weight: normal;
                    font-size: 13px;
                 }

                 .x-error {
                    background: #e64c4c;
                 }

                 .x-countdown-container {
                    width: 80%;
                    flex-grow: 1;
                    align-items: center;
                    justify-content: start;
                    display: flex;
                    margin: 0px 0px 0px 10px;
                 }
             </style>
             <div id="Zucchexit_container" ps-resource-name="Zucchexit" style="margin-bottom: 15px; inset: 306px 250px 346px 0px;" class="resource_container">

             <div id="Zucchexit_title" style="overflow: visible; display: block;">
                 <div id="Zucchexit_portlet_title_container" class="gsmd_gadget_decorator_container">
                     <div id="Zucchexit_portlet_title" portlet_id="Zucchexit_portlet_title" align="left" class="gsmd_gadget_decorator_portlet portlet gadgetDecoratorTitle" style="opacity: 1; transition: opacity 0.2s ease-out; height: 34px;">
                         <span id="Zucchexit_portlet_title_lbl_title" formid="Zucchexit_portlet_title" ps-name="lbl_title" class="title hookable_item lbl_title_ctrl" style="display: none; cursor: move; top: 0px;">
                             <div id="Zucchexit_portlet_title_lbl_titletbl" style="width:100%;">Zucchexit</div>
                         </span>
                         <span id="Zucchexit_portlet_title_lbl_title_openclose" formid="Zucchexit_portlet_title" ps-name="lbl_title_openclose" class="title lbl_title_openclose_ctrl" style="display: block; cursor: default; top: 0px;">
                             <div id="Zucchexit_portlet_title_lbl_title_openclosetbl" style="width:100%;">Zucchexit</div>
                         </span>
                     </div>
                 </div>
             </div>
           
             <div class="column_cb">
                <div class="x-flex">
                    <div class="x-flex-item ${exitTime.isEstimation ? 'single' : ''}">
                        <div class="x-title">
                            <span>${res_timeOfExit}</span>
                        </div>
                        <div>
                            <span class="x-lg-text x-bold">${String(exitTime.date.getHours()).padStart(2, "0")}</span>
                            <span class="x-lg-text">:${String(exitTime.date.getMinutes()).padStart(2, "0")}</span>
                            ${renderEstimatedTo(exitTime.isEstimation, exitTime.date)}
                        </div>
                    </div>
                    ${renderCountdown(!exitTime.isEstimation, res_remainingTime)}
                </div>
                <div class="x-messages">
                    ${renderMessages(exitTime.messages)}
                </div>          
            </div>
            </div>`;
    const node = template.content.cloneNode(true);
    document.querySelector(`div[id$='_ColumnA_container']`).appendChild(node);

    if (!exitTime.isEstimation) {
      var countDownDate = exitTime.date;
      updateCountdown(countDownDate);

      this.zCountdown = setInterval(function () {
        updateCountdown(countDownDate);
      }, 1000);
    }
  }
}


function updateCountdown(countDownDate) {
  var now = new Date().getTime();
  var distance = countDownDate - now;

  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);

  if (distance < 0) {
    clearInterval(this.zCountdown);
    hours = 0;
    minutes = 0;
    seconds = 0;
  }

  let countdown = hours > 0 ? `<span class="x-bold">${hours}h </span><span>${minutes}m</span>` :
    `<span class="x-bold">${minutes}m </span><span>${seconds}s</span>`;

  document.getElementById("x-countdown").innerHTML = countdown;
}

function renderCountdown(render, res_remainingTime) {
  return render ? `<div class="x-flex-item" style="border-left: 1px solid #e3e3e3;">
            <div class="x-title">${res_remainingTime}</div>
            <div class="x-countdown-container">
                <span class="x-md-text" id="x-countdown"></span>
            </div>
        </div>` : ``;

}

function renderEstimatedTo(isEstimation, date) {
  if (isEstimation) {
    date.setMinutes(date.getMinutes() + 30);
    return `<span class="x-lg-text">&nbsp;-&nbsp;</span>
        <span class="x-lg-text x-bold">${String(date.getHours()).padStart(2, "0")}</span>
        <span class="x-lg-text">:${String(date.getMinutes()).padStart(2, "0")}</span>`
  }

  return ``;
}

function renderMessages(messages) {
  let html = '';

  messages.forEach(x => {
    html += `<div class="x-message"><span class="x-icon x-${x.icon}"></span>${x.message}</div>`;
  });

  return html;
}

if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  };
}

let frameElement = document.querySelector(`[name="Main"]`);
let frame = frameElement.contentWindow.document;
frameElement.onload = function () { showExitTime(); };


// ════════════════════════════════════════════════════════════════════════════
// ZUCCHEXIT SYNC — Sincronizzazione automatica timbrature → Google Sheets
// ════════════════════════════════════════════════════════════════════════════
(() => {
  "use strict";

  // ── CONFIGURAZIONE ─────────────────────────────────────────────────────
  // Dopo aver fatto il setup di Apps Script (vedi SETUP.md), incolla qui
  // l'URL che ti ha dato Google. Finché non lo inserisci, il pulsante
  // manuale te lo ricorderà ma il sync automatico sarà silenzioso.
  const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylQp3TLDvPBqq-SZmfxPWdEoLhxTnmmoRl9Ib-ZSj7VNNem1S63l-DlXEl_7QnAvVd3g/exec";

  // ── Costanti ──────────────────────────────────────────────────────────
  const TABLE_SELECTOR = `table[id$="_grid_timbrus"]`;
  const SYNC_BTN_ID = "zucchexit-sync-btn";
  const TOAST_ID = "zucchexit-toast";

  // ── Accesso all'iframe Main ────────────────────────────────────────────
  function getFrameDocument() {
    const f = document.querySelector(`[name="Main"]`);
    if (!f) return null;
    try { return f.contentWindow.document; } catch { return null; }
  }

  // ── Pulizia testo celle ────────────────────────────────────────────────
  function cleanText(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  // ── Lettura timbrature dalla tabella (logica originale di Zucchexit) ──
  function readPunches() {
    const doc = getFrameDocument();
    if (!doc) throw new Error("Iframe Main non trovato.");

    const table = doc.querySelector(TABLE_SELECTOR);
    if (!table) throw new Error("Tabella timbrature non trovata.");

    const rows = Array.from(table.querySelectorAll(`tbody > tr[lookupcells="1"]`));
    const punches = rows
      .map(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 3) return null;
        const time = cleanText(cells[2].innerText);
        const match = time.match(/\b([01]?\d|2[0-3]):[0-5]\d\b/);
        if (!match) return null;
        return {
          ora: match[0],
          verso: row.querySelector(".blue") !== null ? "IN" : "OUT"
        };
      })
      .filter(Boolean);

    // Deduplica per ora+verso
    const seen = new Set();
    const unique = punches.filter(p => {
      const k = `${p.ora}|${p.verso}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    if (unique.length === 0) throw new Error("Nessuna timbratura trovata nella tabella.");
    return unique;
  }

  // ── Deriva T1 / T2 / T5 dalla lista grezza ────────────────────────────
  // Porta la stessa logica del modulo TypeScript services/zucchetti/parser.ts
  function deriveDayTimes(punches) {
    const sorted = [...punches].sort((a, b) => a.ora.localeCompare(b.ora));
    const ins = sorted.filter(p => p.verso === "IN");
    const outs = sorted.filter(p => p.verso === "OUT");

    const t1 = ins[0]?.ora;                                     // prima entrata
    const t2 = outs.find(o => o.ora >= "12:00")?.ora;           // prima uscita dopo mezzogiorno

    let t5;
    if (t2) {
      const rientro = ins.find(i => i.ora > t2);                // prima entrata dopo uscita pranzo
      if (rientro) {
        const lastOut = [...outs].reverse().find(o => o.ora > rientro.ora);
        t5 = lastOut?.ora;                                       // ultima uscita del pomeriggio
      }
    }

    return { t1, t2, t5 };
  }

  // ── Anti-duplicati via chrome.storage.local ────────────────────────────
  function fingerprint(punches) {
    return punches.map(p => `${p.ora}|${p.verso}`).sort().join(",");
  }

  function hasChanged(punches) {
    const key = `lastSync_${new Date().toISOString().slice(0, 10)}`;
    return new Promise(resolve => {
      chrome.storage.local.get([key], result => {
        resolve(result[key] !== fingerprint(punches));
      });
    });
  }

  function saveFingerprint(punches) {
    const key = `lastSync_${new Date().toISOString().slice(0, 10)}`;
    chrome.storage.local.set({ [key]: fingerprint(punches) });
  }

  // ── Toast notification ─────────────────────────────────────────────────
  function showToast(message, type = "success") {
    document.getElementById(TOAST_ID)?.remove();
    const colors = { success: "#15803d", error: "#b91c1c", warn: "#b45309", info: "#1d4ed8" };
    const el = document.createElement("div");
    el.id = TOAST_ID;
    el.textContent = message;
    Object.assign(el.style, {
      position: "fixed", top: "16px", right: "16px", zIndex: "99999",
      background: colors[type] ?? colors.info, color: "#fff",
      padding: "12px 20px", borderRadius: "8px",
      fontFamily: "Segoe UI, Arial, sans-serif", fontSize: "14px",
      boxShadow: "0 4px 14px rgba(0,0,0,.35)", maxWidth: "360px",
      lineHeight: "1.5", whiteSpace: "pre-line"
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 7000);
  }

  // ── Invio dati ad Apps Script ──────────────────────────────────────────
  async function syncToAppsScript(force = false) {
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "INSERISCI_QUI_L_URL_APPS_SCRIPT") {
      if (force) showToast("⚠️ URL Apps Script non configurato.\nSegui il file SETUP.md.", "warn");
      return;
    }

    let punches;
    try {
      punches = readPunches();
    } catch (err) {
      if (force) showToast(`⚠️ ${err.message}`, "warn");
      return;
    }

    const changed = await hasChanged(punches);
    if (!changed && !force) {
      console.log("[Zucchexit Sync] Nessuna timbratura nuova, salto.");
      return;
    }

    const derived = deriveDayTimes(punches);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (force) showToast("🔄 Sincronizzazione in corso…", "info");

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          date: today,
          ...derived
        })
      });
      const data = await res.json();

      if (data.ok) {
        saveFingerprint(punches);
        const detail = data.written
          ? Object.entries(data.written)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
            .join("  ")
          : (data.message ?? "");
        showToast(`✅ Sincronizzato!\n${detail}`, "success");
      } else {
        showToast(`❌ Errore dal server:\n${data.error}`, "error");
      }
    } catch (err) {
      showToast(`❌ Invio fallito:\n${err.message}`, "error");
    }
  }

  // ── Pulsante manuale ───────────────────────────────────────────────────
  function addSyncButton() {
    const doc = getFrameDocument();
    if (!doc) return false;
    if (doc.getElementById(SYNC_BTN_ID)) return true;

    const table = doc.querySelector(TABLE_SELECTOR);
    if (!table?.parentElement) return false;

    const btn = doc.createElement("button");
    btn.id = SYNC_BTN_ID;
    btn.type = "button";
    btn.textContent = "🔄 Sincronizza Timbrature";
    Object.assign(btn.style, {
      display: "block", width: "fit-content", margin: "10px 0",
      padding: "8px 16px", border: "1px solid #0f6cbd",
      borderRadius: "4px", backgroundColor: "#0f6cbd",
      color: "#fff", cursor: "pointer",
      fontFamily: "Segoe UI, Arial, sans-serif",
      fontSize: "13px", fontWeight: "600"
    });
    btn.addEventListener("mouseenter", () => { btn.style.backgroundColor = "#115ea3"; });
    btn.addEventListener("mouseleave", () => { btn.style.backgroundColor = "#0f6cbd"; });
    btn.addEventListener("click", () => syncToAppsScript(true)); // force = true

    table.parentElement.insertBefore(btn, table);
    console.log("[Zucchexit Sync] Pulsante aggiunto.");
    return true;
  }

  // ── Auto-rilevamento: MutationObserver sulla tabella ──────────────────
  let observerAttached = false;
  function setupAutoDetect() {
    if (observerAttached) return;
    const doc = getFrameDocument();
    if (!doc) return;
    const table = doc.querySelector(TABLE_SELECTOR);
    if (!table) return;

    let debounce;
    const observer = new MutationObserver(() => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log("[Zucchexit Sync] Cambio tabella rilevato, sync automatico…");
        syncToAppsScript(false);   // silenzioso se nessuna novità
      }, 2000);
    });
    observer.observe(table, { childList: true, subtree: true });
    observerAttached = true;
    console.log("[Zucchexit Sync] Auto-rilevamento attivato.");
  }

  // ── Inizializzazione ───────────────────────────────────────────────────
  function initialize() {
    observerAttached = false;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (addSyncButton() || attempts >= 60) {
        clearInterval(interval);
        if (attempts < 60) {
          setupAutoDetect();
          syncToAppsScript(false); // sync silenzioso all'apertura della pagina
        }
      }
    }, 500);
  }

  initialize();

  // Reinizializza ogni volta che l'iframe si ricarica
  const mainFrame = document.querySelector(`[name="Main"]`);
  if (mainFrame) {
    mainFrame.addEventListener("load", initialize);
  }
})();
