import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./lib/logger";

const app = createApp();

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "backend listening");
});

// The server binds even if Postgres/Redis are currently unreachable — /health
// reports the degraded state and recovers without a restart. Only invalid
// config (handled in config.ts) prevents startup.

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "shutting down");
    server.close(() => process.exit(0));
  });
}
