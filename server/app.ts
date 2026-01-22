import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export async function createApp() {
  const app = express();

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));

  // register your routes (IMPORTANT: should attach /api routes)
  await registerRoutes(app);

  // error handler
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  return app;
}
