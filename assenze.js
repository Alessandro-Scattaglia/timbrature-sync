// ════════════════════════════════════════════════════════════════════════════
// ZUCCHEXIT ASSENZE — Prossime ferie approvate
// File separato da content.js
// ════════════════════════════════════════════════════════════════════════════
(() => {
  "use strict";

  const CONFIG = {
    sessionPage: "/WFMSCTECHITA2/servlet/hfpf_bstato",
    employeeId: "0000996",
    groupId: "0000010000000176",
    process: "DEFAULT",
    monthsToSearch: 12
  };

  const WIDGET_ID = "zucchexit-assenze-container";
  const ZUCCHEXIT_ID = "Zucchexit_container";
  const WFM_FRAME_ID = "zucchexit-wfm-session";

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getPlanCode(year, month) {
    // Il piano ferie va da marzo a febbraio.
    const planYear = month >= 3 ? year : year - 1;
    return String(planYear).padStart(10, "0");
  }

  function findVacationProvider(frameWindow) {
    if (!frameWindow) return null;

    for (const windowKey of Object.keys(frameWindow)) {
      try {
        const container = frameWindow[windowKey];
        if (!container || typeof container !== "object") continue;

        for (const propertyKey of Object.keys(container)) {
          try {
            const candidate = container[propertyKey];
            if (
              candidate &&
              typeof candidate === "object" &&
              candidate.cmd === "hfpf_qgruapp" &&
              typeof candidate.Query === "function"
            ) {
              return candidate;
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    return null;
  }

  function createHiddenWfmFrame() {
    return new Promise((resolve, reject) => {
      document.getElementById(WFM_FRAME_ID)?.remove();
      document.getElementById(`${WFM_FRAME_ID}-form`)?.remove();

      const iframe = document.createElement("iframe");
      iframe.id = WFM_FRAME_ID;
      iframe.name = WFM_FRAME_ID;
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const form = document.createElement("form");
      form.id = `${WFM_FRAME_ID}-form`;
      form.method = "POST";
      form.action = CONFIG.sessionPage;
      form.target = iframe.name;
      form.style.display = "none";

      const parameters = {
        m_cAction: "execute",
        m_cAtExit: "",
        m_cWv: [
          "Rows=0",
          "0#IDGRUPPO=",
          "0#pLINKDAMAIL=",
          "0#cNOTMRDLC=",
          "0#cNOTMRDLE=",
          "0#pPERIODO=",
          "0#pGRUPPO=",
          "0#pMESE=0",
          "0#pIDC=",
          "0#pIDE=",
          "0#pCHICHIAMA="
        ].join("\n")
      };

      Object.entries(parameters).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      const startedAt = Date.now();
      const timer = setInterval(() => {
        try {
          const frameWindow = iframe.contentWindow;
          const provider = findVacationProvider(frameWindow);

          if (provider) {
            clearInterval(timer);
            form.remove();
            resolve({ frameWindow, provider });
            return;
          }
        } catch (_) {}

        if (Date.now() - startedAt > 30000) {
          clearInterval(timer);
          form.remove();
          reject(new Error("Impossibile inizializzare il piano ferie Zucchetti"));
        }
      }, 250);
    });
  }

  function rowToObject(fields, row) {
    return Object.fromEntries(
      fields.map((field, index) => [String(field).toLowerCase(), row[index]])
    );
  }

  function findOwnMonthRow(provider, year, month) {
    const fields = Array.isArray(provider.Fields) ? provider.Fields : [];
    const data = Array.isArray(provider.Data) ? provider.Data : [];

    for (const row of data) {
      if (!Array.isArray(row) || row.length !== fields.length) continue;

      const item = rowToObject(fields, row);
      if (
        String(item.idemploy ?? "").trim() === CONFIG.employeeId &&
        Number(item.anno) === year &&
        Number(item.mese) === month
      ) {
        return item;
      }
    }

    return null;
  }

  async function loadVacationMonth(provider, year, month) {
    const planCode = getPlanCode(year, month);

    // Parametri fissi: Query() li usa senza ripristinare il mese visualizzato.
    provider.parms = [
      `idGruppo=${CONFIG.groupId}`,
      `processo=${CONFIG.process}`,
      `codPF=${planCode}`,
      `anno=${year}`,
      `mese=${month}`,
      "pDISVISGRUPPF=N",
      "NOMEGRUPPO="
    ].join(",");
    provider.parms_source = "";

    provider.Query(false, null, null, true);

    const startedAt = Date.now();
    while (Date.now() - startedAt < 15000) {
      const row = findOwnMonthRow(provider, year, month);
      if (row) return row;
      await sleep(200);
    }

    throw new Error(`Dati ferie non ricevuti per ${month}/${year}`);
  }

  function extractVacationDates(row, year, month, today) {
    if (!row || String(row.statodef ?? "").trim().toLowerCase() !== "app") {
      return [];
    }

    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      if (String(row[`d${day}`] ?? "").trim().toUpperCase() !== "F") continue;

      const date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
      if (date >= today) dates.push(date);
    }

    return dates;
  }

  function groupConsecutiveDates(dates) {
    if (!dates.length) return [];

    const periods = [];
    let start = dates[0];
    let end = dates[0];

    for (let index = 1; index < dates.length; index++) {
      const current = dates[index];
      const expected = new Date(end);
      expected.setDate(expected.getDate() + 1);

      if (current.getTime() === expected.getTime()) {
        end = current;
      } else {
        periods.push({ start, end });
        start = current;
        end = current;
      }
    }

    periods.push({ start, end });
    return periods;
  }

  async function findNextVacation(provider) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 0; offset < CONFIG.monthsToSearch; offset++) {
      const target = new Date(today.getFullYear(), today.getMonth() + offset, 1);
      const year = target.getFullYear();
      const month = target.getMonth() + 1;
      const row = await loadVacationMonth(provider, year, month);
      const periods = groupConsecutiveDates(
        extractVacationDates(row, year, month, today)
      );

      if (periods.length) return periods[0];
    }

    return null;
  }

  function capitalize(text) {
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function formatVacationPeriod(period) {
    if (!period) return "Nessuna ferie approvata nei prossimi 12 mesi";

    const sameDay = period.start.getTime() === period.end.getTime();
    const sameMonth =
      period.start.getMonth() === period.end.getMonth() &&
      period.start.getFullYear() === period.end.getFullYear();

    if (sameDay) {
      return capitalize(period.start.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }));
    }

    if (sameMonth) {
      const monthAndYear = period.end.toLocaleDateString("it-IT", {
        month: "long",
        year: "numeric"
      });
      return `Dal ${period.start.getDate()} al ${period.end.getDate()} ${monthAndYear}`;
    }

    const start = period.start.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    const end = period.end.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
    return `Dal ${start} al ${end}`;
  }

  function createWidget() {
    document.getElementById(WIDGET_ID)?.remove();

    const widget = document.createElement("div");
    widget.id = WIDGET_ID;
    widget.className = "resource_container";
    widget.style.marginBottom = "15px";

    widget.innerHTML = `
      <style>
        #${WIDGET_ID} {
          font-family: "Proxima Nova", "Segoe UI", Arial, sans-serif;
          color: #343434;
        }
        #${WIDGET_ID} .zx-a-heading {
          border-top: 1px solid #e3e3e3;
          padding: 11px 0 9px;
          color: #555;
          font-size: 13px;
          font-weight: 600;
        }
        #${WIDGET_ID} .zx-a-body {
          padding: 8px 8px 13px;
          text-align: center;
        }
        #${WIDGET_ID} .zx-a-label {
          color: #777;
          font-size: 12px;
          font-weight: 600;
        }
        #${WIDGET_ID} .zx-a-period {
          margin-top: 7px;
          font-size: 17px;
          font-weight: 600;
          line-height: 1.35;
        }
        #${WIDGET_ID} .zx-a-status {
          color: #777;
          font-size: 12px;
          line-height: 1.4;
        }
        #${WIDGET_ID} .zx-a-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-right: 6px;
          border-radius: 50%;
          background: #ffa500;
          vertical-align: 1px;
        }
      </style>
      <div class="zx-a-heading">Prossime ferie e permessi approvati</div>
      <div class="zx-a-body">
        <div class="zx-a-status">
          <span class="zx-a-dot"></span>Ricerca prossime ferie…
        </div>
      </div>
    `;

    return widget;
  }

  function renderVacation(widget, period) {
    widget.querySelector(".zx-a-body").innerHTML = `
      <div class="zx-a-period">${formatVacationPeriod(period)}</div>
    `;
  }

  function renderError(widget, error) {
    widget.querySelector(".zx-a-body").innerHTML = `
      <div class="zx-a-status">
        <span class="zx-a-dot"></span>${error.message}
      </div>
    `;
    console.error("[Zucchexit Assenze]", error);
  }

  function waitForZucchexit() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts++;
        const zucchexit = document.getElementById(ZUCCHEXIT_ID);

        if (zucchexit) {
          clearInterval(timer);
          resolve(zucchexit);
        } else if (attempts >= 80) {
          clearInterval(timer);
          reject(new Error("Widget Zucchexit non trovato"));
        }
      }, 500);
    });
  }

  async function initialize() {
    try {
      const zucchexit = await waitForZucchexit();
      const widget = createWidget();
      zucchexit.insertAdjacentElement("afterend", widget);

      try {
        const { provider } = await createHiddenWfmFrame();
        const nextVacation = await findNextVacation(provider);
        renderVacation(widget, nextVacation);
      } catch (error) {
        renderError(widget, error);
      }
    } catch (error) {
      console.error("[Zucchexit Assenze]", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
