import { loadConfig } from "./config/config.js";
import { createLogger } from "./logger/logger.js";
import { createReceiverServer } from "./server/receiver.js";

const settings = loadConfig();
const logger = createLogger(settings.logLevel);

logger.info("=== Timbrature Sync — Server in avvio ===");
logger.info(`Excel: ${settings.excelPath}`);

createReceiverServer(settings.excelPath, settings.serverPort, logger);
