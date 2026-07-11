export interface DayState {
  t1?: string;
  t2?: string;
  t5?: string;
  lastSync: string; // ISO timestamp
}

export interface SyncState {
  days: Record<string, DayState>; // chiave: "YYYY-MM-DD"
}
