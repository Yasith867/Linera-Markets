import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request } from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

// Load dotenv only locally (optional)
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv/config");
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req: Request, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Setup routes once
const ready = (async () => {
  await registerRoutes(httpServer, app);

  // error handler
  app.use((err: any, _req: Request, res: any, next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  return app;
})();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await ready;
  return (expressApp as any)(req, res);
}
