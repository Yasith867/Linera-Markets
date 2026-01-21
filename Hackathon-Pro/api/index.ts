import express from "express";
import { createServer } from "http";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { registerRoutes } from "../server/routes";

// Create express app once (reused between requests)
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Your registerRoutes expects (httpServer, app)
const httpServer = createServer(app);

// Run route setup ONCE
const ready = (async () => {
  await registerRoutes(httpServer, app);
  return app;
})();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await ready;
  return (expressApp as any)(req, res);
}
