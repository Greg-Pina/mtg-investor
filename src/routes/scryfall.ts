import { Router } from 'express';
import { ScryfallService } from '../services/ScryfallService';
import { CardModel } from '../models';
import { jsonParsingMiddleware } from '../middleware';

const router = Router();
const svc = ScryfallService.getInstance();

// Admin: trigger incremental/bulk ingest from Scryfall (limited for safety)
router.post(
  '/ingest',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 128 * 1024 }),
  jsonParsingMiddleware.sanitizeJson(),
  async (req, res) => {
    try {
      const { limit = 500 } = req.body || {};
      const result = await svc.ingestAllCards(Math.min(5000, Number(limit) || 500));
      res.json({ success: true, ...result });
    } catch (e: any) {
      console.error('Scryfall ingest error', e);
      res.status(500).json({ success: false, error: e?.message || 'ingest-failed' });
    }
  }
);

// DB-only query for user-facing searches
router.get('/cards', async (req, res) => {
  try {
    const { q, setCode, rarity, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (q && typeof q === 'string') filter.$text = { $search: q };
    if (setCode && typeof setCode === 'string') filter.setCode = (setCode as string).toLowerCase();
    if (rarity && typeof rarity === 'string') filter.rarity = rarity;

    const [cards, total] = await Promise.all([
      CardModel.find(filter)
        .sort(q ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      CardModel.countDocuments(filter)
    ]);

    res.json({ success: true, cards, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (e: any) {
    console.error('Card DB query error', e);
    res.status(500).json({ success: false, error: e?.message || 'query-failed' });
  }
});

export default router;
