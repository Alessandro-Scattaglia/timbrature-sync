import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveDayTimes } from "../src/services/zucchetti/parser.js";

test("giornata completa con pausa pranzo e rientro -> T1, T2, T5 corretti", () => {
  const punches = [
    { time: "08:16", direction: "IN" as const },
    { time: "13:00", direction: "OUT" as const },
    { time: "13:30", direction: "IN" as const },
    { time: "17:05", direction: "OUT" as const },
  ];

  const result = deriveDayTimes(punches);

  assert.equal(result.t1, "08:16");
  assert.equal(result.t2, "13:00");
  assert.equal(result.t5, "17:05");
});

test("giornata in corso (solo entrata) -> solo T1", () => {
  const result = deriveDayTimes([{ time: "08:20", direction: "IN" }]);

  assert.equal(result.t1, "08:20");
  assert.equal(result.t2, undefined);
  assert.equal(result.t5, undefined);
});

test("uscita per pausa pranzo senza ancora rientro -> nessun T5", () => {
  const punches = [
    { time: "08:16", direction: "IN" as const },
    { time: "13:00", direction: "OUT" as const },
  ];

  const result = deriveDayTimes(punches);

  assert.equal(result.t1, "08:16");
  assert.equal(result.t2, "13:00");
  assert.equal(result.t5, undefined);
});

test("timbrature fuori ordine cronologico vengono comunque ordinate", () => {
  const punches = [
    { time: "17:05", direction: "OUT" as const },
    { time: "08:16", direction: "IN" as const },
    { time: "13:30", direction: "IN" as const },
    { time: "13:00", direction: "OUT" as const },
  ];

  const result = deriveDayTimes(punches);

  assert.equal(result.t1, "08:16");
  assert.equal(result.t2, "13:00");
  assert.equal(result.t5, "17:05");
});
