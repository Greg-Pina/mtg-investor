import http from "http";
import { createApp, initializeDatabase } from "./app";
import cron from 'node-cron';
import { ScryfallService } from './services/ScryfallService';
import { validateEnv } from './config/env';
import { InvestmentScoringService } from './services/InvestmentScoringService';
import { AlertService } from './services/AlertService';

async function startServer() {
  try {
    validateEnv();

    // Initialize database connection
    await initializeDatabase();
    console.log('Database initialized successfully');

    // Create Express app
    const app = createApp();
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;

    // Create HTTP server
    const server = http.createServer(app);

    // Start listening
    server.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
      console.log('Available endpoints:');
      console.log('  GET  /api/health         - Health check');
      console.log('  GET  /api/hello          - Hello world');
      console.log('');
      console.log('Data Processing:');
      console.log('  POST /api/data/process   - Process JSON data');
      console.log('  GET  /api/data/processed - Get all processed data');
      console.log('  GET  /api/data/processed/:id - Get specific processed data');
      console.log('  DELETE /api/data/processed/:id - Delete processed data');
      console.log('');
      console.log('MTG Card Data:');
      console.log('  POST /api/mtg/process    - Process MTG card data');
      console.log('  GET  /api/mtg/card/:name - Get specific card data');
      console.log('  GET  /api/mtg/search     - Search cards (q, page, limit, isCommander, hasCombos)');
      console.log('  GET  /api/mtg/investment - Get investment potential cards');
      console.log('  DELETE /api/mtg/card/:name - Delete card data');
    });

    if (process.env.SCHEDULE_INGEST === 'true') {
      const svc = ScryfallService.getInstance();
      cron.schedule('0 2 * * *', async () => {
        try {
          console.log('[cron] Starting daily Scryfall ingest...');
          const { saved } = await svc.ingestAllCards(2000);
          console.log(`[cron] Scryfall ingest completed. Saved ${saved} records.`);
        } catch (err) {
          console.error('[cron] Scryfall ingest failed:', err);
        }
      });
      cron.schedule('0 3 * * *', async () => {
        try {
          console.log('[cron] Starting investment score update...');
          const scorer = new InvestmentScoringService();
          await scorer.updateAllScores();
          console.log('[cron] Investment score update completed.');
        } catch (err) {
          console.error('[cron] Investment score update failed:', err);
        }
      });
      cron.schedule('30 3 * * *', async () => {
        try {
          console.log('[cron] Checking price alerts...');
          const alertSvc = AlertService.getInstance();
          const { checked, triggered } = await alertSvc.checkAlerts();
          console.log(`[cron] Alert check done: ${checked} checked, ${triggered} triggered.`);
        } catch (err) {
          console.error('[cron] Alert check failed:', err);
        }
      });
      console.log('Daily cron jobs scheduled: ingest@02:00, scoring@03:00, alerts@03:30');
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
