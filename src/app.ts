import express, { Application } from "express";
import routes from "./routes";
import dotenv from "dotenv";
import path from "path";
import { DatabaseAdapter } from "./adapters/database";
import { apiLimiter, pageLimiter } from "./middleware/rateLimiter";
import { logger } from "./utils/logger";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { CacheService } from "./services/CacheService";

dotenv.config({ path: path.join(__dirname, "../configs/.env") });

export function createApp(): Application {
  const app = express();

  // CORS — allow configured origins or all in development
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') ?? [];
  app.use((req, res, next) => {
    const origin = req.headers.origin ?? '';
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });

  app.use(express.json());

  // Warm up cache connection eagerly
  CacheService.getInstance();

  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  // Swagger docs
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Apply global API rate limit
  app.use("/api", apiLimiter);

  app.use("/api", routes);

  const publicDir = path.join(__dirname, "../public");
  app.use(express.static(publicDir));

  // Named page routes — rate-limited to prevent scraping
  app.get('/store', pageLimiter, (_req, res) => res.sendFile(path.join(publicDir, 'store.html')));
  app.get('/admin', pageLimiter, (_req, res) => res.sendFile(path.join(publicDir, 'admin.html')));

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Multer file upload error handler
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof Error && err.message === 'Only CSV files are accepted') {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error(err instanceof Error ? err.message : String(err), { err });
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}

export async function initializeDatabase(): Promise<void> {
  const database = DatabaseAdapter.getInstance();
  await database.connect();
}
