import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Standard Vite output: dist/
  const distPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find build dir: ${distPath}. Run "npm run build" first.`);
  }

  app.use(express.static(distPath));

  // SPA fallback
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
