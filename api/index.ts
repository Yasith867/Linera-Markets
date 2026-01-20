import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

// We initialize once and reuse between invocations
const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Optional: simple health check
app.get("/api/healthz", (_req, res) => res.status(200).json({ ok: true }));

// Boot routes once
let bootPromise: Promise<void> | null = null;
function boot() {
  if (!bootPromise) {
    bootPromise = (async () => {
      const httpServer = createServer(app);
      await registerRoutes(httpServer, app);

      // Error handler after routes
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err?.status || err?.statusCode || 500;
        const message = err?.message || "Internal Server Error";
        console.error(err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
    })();
  }
  return bootPromise;
}

// Vercel handler
export default async function handler(req: any, res: any) {
  await boot();
  return app(req, res);
}
