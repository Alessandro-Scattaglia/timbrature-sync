import type { DerivedDayTimes, Timbratura } from "../../types/timbratura.js";

/**
 * Deriva T1 (prima entrata), T2 (uscita pranzo) e T5 (uscita reale finale)
 * dall'elenco grezzo di timbrature del giorno.
 *
 * La logica di lettura (IN se la riga ha classe .blue, OUT altrimenti) è la
 * stessa di Zucchexit/content.js (getExitTime()), ma qui NON calcoliamo
 * stime: vogliamo solo i dati reali già timbrati, per scriverli in Excel.
 *
 * Funzione pura, senza I/O: facilmente testabile in isolamento.
 */
export function deriveDayTimes(punches: Timbratura[]): DerivedDayTimes {
  const sorted = [...punches].sort((a, b) => a.time.localeCompare(b.time));
  const ins = sorted.filter((p) => p.direction === "IN");
  const outs = sorted.filter((p) => p.direction === "OUT");

  const t1 = ins[0]?.time;

  // Prima uscita dalle 12:00 in poi = uscita per la pausa pranzo
  const uscitaPranzo = outs.find((o) => o.time >= "12:00");
  const t2 = uscitaPranzo?.time;

  // T5 (uscita reale) ha senso solo se c'è stato un rientro DOPO la pausa
  // pranzo: altrimenti l'unico OUT della giornata *è* la pausa pranzo (T2),
  // non la fine del lavoro.
  let t5: string | undefined;
  const rientro = t2 ? ins.find((i) => i.time > t2) : undefined;
  if (rientro) {
    const lastOut = [...outs].reverse().find((o) => o.time > rientro.time);
    t5 = lastOut?.time;
  }

  return { t1, t2, t5 };
}
