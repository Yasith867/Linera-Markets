import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request } from "express";
import { createServer } from "http";

// Load dotenv only locally
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

let readyPromise: Promise<any> | null = null;

async function getReadyApp() {
  if (!readyPromise) {
    readyPromise = (async () => {
      const { registerRoutes } = await import("../server/routes");
      await registerRoutes(httpServer as any, app);

      // error handler (ensures JSON errors)
      app.use((err: any, _req: Request, res: any, next: any) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error(err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });

      return app;
    })();
  }
  return readyPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ normalize path so Express routes using "/api/..." always match
  // If Vercel gives "/wallet/faucet", we convert it to "/api/wallet/faucet"
  const url = req.url || "/";
  if (!url.startsWith("/api/")) {
    req.url = "/api" + (url.startsWith("/") ? "" : "/") + url;
  }

  const expressApp = await getReadyApp();
  return (expressApp as any)(req, res);
}
