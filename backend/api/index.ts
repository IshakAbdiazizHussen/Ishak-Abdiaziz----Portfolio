/**
 * Vercel serverless entrypoint.
 *
 * This is an ADAPTER LAYER ONLY — it defines no routes, no middleware, no
 * business logic. It re-uses the exact same Express app that local dev builds
 * (`createApp()` in `src/app.ts`), unchanged.
 *
 * How a request reaches Express on Vercel:
 *   1. `vercel.json` rewrites every path (`/(.*)`)  →  this function (`/api`).
 *   2. Vercel's Node runtime invokes the default export below with Node's
 *      `(req, res)` — an `http.IncomingMessage` / `http.ServerResponse`.
 *   3. An Express app IS a `(req, res) => void` request listener (the same
 *      value `http.createServer(app)` takes), so Vercel calls it directly.
 *      `req.url` still holds the original path, so Express routes it normally
 *      (`/api/admin/login`, `/health`, …).
 *
 * No wrapper library (e.g. `serverless-http`) is needed: `serverless-http`
 * targets the AWS Lambda `(event, context)` shape, whereas Vercel already hands
 * us a plain Node `(req, res)`.
 *
 * `app` is built once per cold start and reused across warm invocations.
 *
 * Local dev is untouched: `npm run dev` / `npm start` run `src/index.ts`, which
 * calls `createApp().listen(...)`. Nothing imports this file locally.
 */
import { createApp } from "../src/app";

const app = createApp();

export default app;
