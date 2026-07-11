export type PunchDirection = "IN" | "OUT";

export interface Timbratura {
  time: string; // formato "HH:MM"
  direction: PunchDirection;
}

export interface DerivedDayTimes {
  t1?: string; // prima entrata
  t2?: string; // uscita pranzo
  t5?: string; // uscita reale finale
}
