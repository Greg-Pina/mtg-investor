import express, { Application } from "express";
import routes from "./routes";
import dotenv from "dotenv";
import path from "path";
import { DatabaseAdapter } from "./adapters/database";

dotenv.config({ path: path.join(__dirname, "../configs/.env") });

export function createApp(): Application {
  const app = express();

  // Core middleware
  app.use(express.json());

  // Example: common request logging (simple)
  app.use((req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Routes
  app.use("/api", routes);

  // Serve static assets for a simple UI
  const publicDir = path.join(__dirname, "../public");
  app.use(express.static(publicDir));

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}

export async function initializeDatabase(): Promise<void> {
  const database = DatabaseAdapter.getInstance();
  await database.connect();
}
