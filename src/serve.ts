import { loadConfig } from "./config/config.js";
import { env } from "./config/env.schema.js";
import { createLogger } from "./logger/logger.js";
import { createReceiverServer } from "./server/receiver.js";

const settings = loadConfig();
const logger = createLogger(settings.logLevel);
const port = env.PORT ?? settings.serverPort;

logger.info("=== Timbrature Sync - Server in avvio ===");
logger.info(`Excel: ${settings.excelPath}`);

createReceiverServer(
  settings.excelPath,
  {
    host: env.HOST,
    port,
    protocol: env.SERVER_PROTOCOL,
    sslKeyPath: env.SSL_KEY,
    sslCertPath: env.SSL_CERT,
    corsOrigin: env.CORS_ORIGIN,
  },
  logger
);
