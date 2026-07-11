import fs from "node:fs";
import path from "node:path";
import winston from "winston";
import { paths } from "../config/config.js";

function ensureLogsDir(): void {
  if (!fs.existsSync(paths.logsDir)) {
    fs.mkdirSync(paths.logsDir, { recursive: true });
  }
}

let instance: winston.Logger | undefined;

export function createLogger(level: string = "info"): winston.Logger {
  if (instance) return instance;

  ensureLogsDir();

  instance = winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ timestamp, level: lvl, message }) => `[${timestamp}] ${lvl.toUpperCase()}: ${message}`)
    ),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: path.join(paths.logsDir, "sync.log"),
        maxsize: 5_000_000,
        maxFiles: 5,
      }),
    ],
  });

  return instance;
}
