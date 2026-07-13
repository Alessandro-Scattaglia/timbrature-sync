/**
 * Genera dist/bookmarklet.html — da eseguire una volta sulla VM con:
 *   npm run bookmarklet
 *
 * L'HTML contiene il bookmarklet già configurato con l'IP della VM e la porta.
 * Copiare il file sul PC personale (via USB, mail, OneDrive...) e aprirlo
 * in Edge o Chrome per aggiungere il bookmarklet ai preferiti.
 */
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config/config.js";

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
}

const settings = loadConfig();
const vmIp = getLocalIp();
const serverUrl = `http://${vmIp}:${settings.serverPort}`;

// Il codice JavaScript del bookmarklet — deve stare tutto su una riga
// come javascript: URL. Lo scriviamo leggibile e poi lo minifichiamo inline.
const bookmarkletSource = `
(async function () {
  // ── 1. Verifica che la pagina sia Zucchetti ──────────────────────────────
  const SERVER = "${serverUrl}";
  const toast = (msg, color) => {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position: "fixed", top: "16px", right: "16px", zIndex: 99999,
      background: color || "#1f3864", color: "#fff", padding: "12px 20px",
      borderRadius: "8px", fontFamily: "Arial", fontSize: "14px",
      boxShadow: "0 4px 12px rgba(0,0,0,.3)", maxWidth: "340px"
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  };

  // ── 2. Ping per verificare che il server sulla VM sia raggiungibile ──────
  try {
    const ping = await fetch(SERVER + "/api/ping", { mode: "cors", signal: AbortSignal.timeout(4000) });
    if (!ping.ok) throw new Error("ping fallito");
  } catch {
    toast("❌ Server VM non raggiungibile (" + SERVER + "). Verifica che la VM sia accesa e che \\'npm run serve\\' sia in esecuzione.", "#b91c1c");
    return;
  }

  // ── 3. Legge la tabella timbrature dall\\'iframe Main (logica Zucchexit) ──
  const iframe = document.querySelector("iframe[name=\\"Main\\"]") ||
    [...document.querySelectorAll("iframe")].find(f => f.name === "Main");
  if (!iframe) {
    toast("⚠️ Iframe \\"Main\\" non trovato. Sei sulla pagina giusta di Zucchetti?", "#b45309");
    return;
  }
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const table = doc?.querySelector("table[id$=\\"_grid_timbrus\\"]");
  if (!table) {
    toast("⚠️ Tabella timbrature non trovata. Attendi che la pagina si carichi completamente.", "#b45309");
    return;
  }
  const rows = [...table.querySelectorAll("tbody>tr[lookupcells=\\"1\\"]")];
  const punches = rows.map(row => ({
    time: row.querySelectorAll(":nth-child(3)")[0]?.innerText?.trim(),
    direction: row.querySelectorAll(".blue").length > 0 ? "IN" : "OUT"
  })).filter(p => p.time && /^\\d{2}:\\d{2}$/.test(p.time));

  if (punches.length === 0) {
    toast("ℹ️ Nessuna timbratura trovata per oggi.", "#1d4ed8");
    return;
  }

  // ── 4. Invia i dati al server sulla VM ───────────────────────────────────
  const today = new Date();
  const date = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");

  try {
    const res = await fetch(SERVER + "/api/punches", {
      method: "POST", mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, punches })
    });
    const data = await res.json();
    if (data.ok) {
      const detail = data.written
        ? " → " + Object.entries(data.written).filter(([,v])=>v).map(([k,v])=>k.toUpperCase()+": "+v).join("  ")
        : data.message || "";
      toast("✅ Sincronizzato!" + detail, "#15803d");
    } else {
      toast("❌ Errore: " + data.error, "#b91c1c");
    }
  } catch (err) {
    toast("❌ Invio fallito: " + err.message, "#b91c1c");
  }
})();
`.trim();

// Minificazione basilare: rimuove newline e spazi multipli iniziali di riga
const minified = bookmarkletSource
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean)
  .join(" ");

const bookmarkletUrl = `javascript:${encodeURIComponent(minified)}`;

const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Timbrature Sync — Installa Bookmarklet</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 60px auto; padding: 0 20px; color: #1a1a1a; }
    h1 { color: #1f3864; }
    .step { margin: 28px 0; padding: 20px 24px; border-left: 4px solid #2f5496; background: #f0f4fb; border-radius: 0 8px 8px 0; }
    .step h2 { margin: 0 0 8px; font-size: 16px; color: #2f5496; }
    .bookmark-btn {
      display: inline-block; margin: 16px 0;
      background: #1f3864; color: #fff !important;
      text-decoration: none; padding: 14px 28px;
      border-radius: 8px; font-size: 15px; font-weight: bold;
      box-shadow: 0 3px 10px rgba(0,0,0,.25); cursor: grab;
    }
    .bookmark-btn:hover { background: #2f5496; }
    code { background: #e8edf5; padding: 2px 7px; border-radius: 4px; font-size: 13px; }
    .info { background: #fef9c3; border-left: 4px solid #ca8a04; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 24px; }
    .server { font-family: monospace; background: #1e293b; color: #86efac; padding: 6px 14px; border-radius: 6px; font-size: 14px; }
  </style>
</head>
<body>
  <h1>🔖 Timbrature Sync — Bookmarklet</h1>
  <p>Questo file è stato generato dalla VM il <strong>${new Date().toLocaleString("it-IT")}</strong>.<br>
  Il bookmarklet è già configurato per connettersi al server sulla VM:</p>
  <p class="server">${serverUrl}</p>

  <div class="step">
    <h2>① Mostra la barra dei preferiti del browser</h2>
    <p>Edge/Chrome: premi <code>Ctrl + Shift + B</code></p>
  </div>

  <div class="step">
    <h2>② Trascina questo pulsante sulla barra dei preferiti</h2>
    <a class="bookmark-btn" href="${bookmarkletUrl}">🕐 Sincronizza Timbrature</a>
    <p style="margin-top:8px;font-size:13px;color:#555">
      (Trascina il pulsante azzurro sulla barra in alto del browser — non cliccarci qui)
    </p>
  </div>

  <div class="step">
    <h2>③ Come usarlo ogni giorno</h2>
    <ol>
      <li>Apri il portale Zucchetti e vai sulla pagina con le timbrature</li>
      <li>Assicurati che la VM sia accesa e che <code>npm run serve</code> sia in esecuzione</li>
      <li>Clicca il bookmarklet <strong>"🕐 Sincronizza Timbrature"</strong> dalla barra preferiti</li>
      <li>Comparirà un messaggio verde con i dati scritti, oppure rosso con l'errore</li>
    </ol>
  </div>

  <div class="info">
    ⚠️ Se vedi <strong>"Server VM non raggiungibile"</strong>: verifica che la VM sia accesa
    e che tu abbia avviato <code>npm run serve</code> dentro la cartella del progetto.
    Se il problema persiste, il PC personale e la VM potrebbero non essere sulla stessa rete
    — contatta il supporto IT o scrivi all'assistenza del progetto.
  </div>
</body>
</html>`;

const outDir = path.resolve(process.cwd(), "dist");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "bookmarklet.html");
fs.writeFileSync(outPath, html, "utf-8");

console.log(`✅ Bookmarklet generato: ${outPath}`);
console.log(`   IP VM rilevato: ${vmIp}  Porta: ${settings.serverPort}`);
console.log(`   Server URL: ${serverUrl}`);
console.log(`\n👉 Copia il file sul PC personale e aprilo nel browser per installare il bookmarklet.`);
