import express, { type Express } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { config, storageDriver } from "./config";
import { logger } from "./lib/logger";
import { pingDb } from "./lib/db";
import { pingRedis } from "./lib/redis";
import { LOCAL_UPLOAD_DIR } from "./lib/storage";
import { corsMiddleware } from "./middleware/cors";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { adminRouter } from "./routes/admin";
import { logRouter } from "./routes/log";
import { contactRouter } from "./routes/contact";
import { contentRouter } from "./routes/content";
import { projectsRouter } from "./routes/projects";
import { toolboxRouter } from "./routes/toolbox";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Trust exactly N proxy hops so req.ip is the real client (Railway = 1).
  // Never `true` — that lets clients spoof X-Forwarded-For.
  app.set("trust proxy", config.TRUST_PROXY_HOPS);

  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === "/health" },
    }),
  );
  app.use(
    helmet({
      // This is a JSON API consumed cross-origin by the frontend; the default
      // `same-origin` CORP would fight CORS.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(corsMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", async (_req, res) => {
    const [db, cache] = await Promise.all([pingDb(), pingRedis()]);
    const ok = db && cache;
    res.status(ok ? 200 : 503).json({ ok, postgres: db, redis: cache });
  });

  // Local storage driver: serve previously-uploaded files read-only. Keys are
  // server-generated UUIDs, so the content is immutable and long-cacheable.
  // Missing files fall through to the 404 handler.
  if (storageDriver === "local") {
    app.use(
      "/uploads",
      express.static(LOCAL_UPLOAD_DIR, {
        index: false,
        dotfiles: "ignore",
        immutable: true,
        maxAge: "365d",
      }),
    );
    logger.info({ dir: LOCAL_UPLOAD_DIR }, "storage: local driver — uploads served at /uploads");
  }

  app.use("/api/admin", adminRouter);
  app.use("/api/log", logRouter);
  app.use("/api/contact", contactRouter);
  app.use("/api/content", contentRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/toolbox", toolboxRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
