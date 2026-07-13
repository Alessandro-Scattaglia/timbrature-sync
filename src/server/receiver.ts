import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import express from "express";
import type { Logger } from "winston";
import { incomingPunchSchema } from "./schema.js";
import { deriveDayTimes } from "../services/zucchetti/parser.js";
import { ExcelWriter } from "../excel/excelWriter.js";
import { loadState, saveState, getDayState, setDayState, diffAgainstState } from "../state/stateStore.js";

type ReceiverServerOptions = {
  host: string;
  port: number;
  protocol: "http" | "https";
  sslKeyPath: string;
  sslCertPath: string;
  corsOrigin: string;
};

function resolveFromCwd(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function readCertificateFile(filePath: string, label: string): Buffer {
  const resolved = resolveFromCwd(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Certificato HTTPS mancante (${label}): ${resolved}`);
  }
  return fs.readFileSync(resolved);
}

export function createReceiverServer(
  excelPath: string,
  options: ReceiverServerOptions,
  logger: Logger
): void {
  const app = express();
  app.use(express.json());

  // Permette richieste dal bookmarklet, che gira sul dominio Zucchetti.
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", options.corsOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
  });

  app.options("/api/ping", (_req, res) => {
    res.sendStatus(204);
  });

  app.options("/api/punches", (_req, res) => {
    res.sendStatus(204);
  });

  // Health check: il bookmarklet lo chiama prima del POST.
  app.get("/api/ping", (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.post("/api/punches", async (req, res) => {
    const parsed = incomingPunchSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      logger.warn(`Dati non validi ricevuti dal bookmarklet: ${msg}`);
      res.status(400).json({ ok: false, error: msg });
      return;
    }

    const { date, punches } = parsed.data;
    logger.info(`Ricevute ${punches.length} timbrature per il ${date}`);

    try {
      const derived = deriveDayTimes(punches);
      const targetDate = new Date(`${date}T12:00:00`); // ora fissa per evitare problemi DST

      const state = loadState();
      const previous = getDayState(state, date);
      const toWrite = diffAgainstState(previous, derived);

      if (!toWrite.t1 && !toWrite.t2 && !toWrite.t5) {
        logger.info("Nessuna timbratura nuova rispetto all'ultima sincronizzazione.");
        res.json({ ok: true, message: "Nessuna modifica necessaria" });
        return;
      }

      const writer = new ExcelWriter(excelPath, logger);
      await writer.updateDay(targetDate, toWrite);

      setDayState(state, date, {
        t1: derived.t1 ?? previous?.t1,
        t2: derived.t2 ?? previous?.t2,
        t5: derived.t5 ?? previous?.t5,
        lastSync: new Date().toISOString(),
      });
      saveState(state);

      logger.info(`Excel aggiornato: ${JSON.stringify(toWrite)}`);
      res.json({ ok: true, written: toWrite });
    } catch (err) {
      const message = (err as Error).message;
      logger.error(`Errore durante l'aggiornamento Excel: ${message}`);
      res.status(500).json({ ok: false, error: message });
    }
  });

  const server =
    options.protocol === "https"
      ? https.createServer(
          {
            key: readCertificateFile(options.sslKeyPath, "SSL_KEY"),
            cert: readCertificateFile(options.sslCertPath, "SSL_CERT"),
          },
          app
        )
      : http.createServer(app);

  server.listen(options.port, options.host, () => {
    logger.info(`Server in ascolto su ${options.protocol}://${options.host}:${options.port}`);
    logger.info(`Health check: ${options.protocol}://localhost:${options.port}/api/ping`);
  });
}
