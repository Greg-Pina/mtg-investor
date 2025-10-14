import { Router } from 'express';
import { EnrichmentController } from '../controllers';
import { jsonParsingMiddleware } from '../middleware';

const router = Router();
const controller = new EnrichmentController();

router.post(
  '/tcg',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 256 * 1024 }),
  jsonParsingMiddleware.sanitizeJson(),
  controller.enrichTCG.bind(controller)
);

router.post(
  '/edhrec',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 256 * 1024 }),
  jsonParsingMiddleware.sanitizeJson(),
  controller.enrichEDHREC.bind(controller)
);

export default router;
