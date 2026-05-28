import { Router } from 'express';
import { ScryfallController } from '../controllers/scryfallController';
import { jsonParsingMiddleware } from '../middleware';
import { scryfallLimiter } from '../middleware/rateLimiter';

const router = Router();
const ctrl = new ScryfallController();

router.get('/search', scryfallLimiter, (req, res) => ctrl.search(req, res));
router.post('/save', (req, res) => ctrl.saveSearch(req, res));
router.post(
  '/ingest',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 128 * 1024 }),
  jsonParsingMiddleware.sanitizeJson(),
  (req, res) => ctrl.ingest(req, res)
);
router.get('/cards', (req, res) => ctrl.querySaved(req, res));

export default router;
