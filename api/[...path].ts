// api/[...path].ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express, { type Request } from "express";
import { createServer } from "http";

// Load dotenv only locally (MUST happen before importing routes/db)
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

let readyPromise: Promise<express.Express> | null = null;

async function getReadyApp() {
  if (!readyPromise) {
    readyPromise = (async () => {
      // IMPORTANT: import routes AFTER dotenv has been loaded
      const { registerRoutes } = await import("../server/routes");

      await registerRoutes(httpServer as any, app);

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
  }
  return readyPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getReadyApp();
  return (expressApp as any)(req, res);
}
