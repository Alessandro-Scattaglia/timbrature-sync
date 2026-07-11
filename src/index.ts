import { runSyncCycle } from "./scheduler/runCycle.js";

runSyncCycle()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));