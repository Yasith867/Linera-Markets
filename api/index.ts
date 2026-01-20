import express from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/static";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  await registerRoutes(app);

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  }

})();

export default app;
