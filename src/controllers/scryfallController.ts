import { Request, Response } from 'express';
import { ScryfallService } from '../services/ScryfallService';
import { CardModel } from '../models';

export class ScryfallController {
  private scryfall: ScryfallService;

  constructor() {
    this.scryfall = ScryfallService.getInstance();
  }

  /** GET /api/scryfall/search?q=...&page=... */
  public async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, page } = req.query;
      if (!q || typeof q !== 'string') {
        res.status(400).json({ success: false, error: 'Missing query param q' });
        return;
      }
      const pageNum = page ? parseInt(page as string) : 1;
      const result = await this.scryfall.searchCards(q, isNaN(pageNum) ? 1 : pageNum);
      res.status(200).json({ success: true, result });
    } catch (err) {
      console.error('Scryfall search error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /** POST /api/scryfall/save — Body: { q: string, pages?: number } */
  public async saveSearch(req: Request, res: Response): Promise<void> {
    try {
      const { q, pages = 1 } = req.body || {};
      if (!q || typeof q !== 'string') {
        res.status(400).json({ success: false, error: 'Body.q is required' });
        return;
      }
      const pagesNum = Math.max(1, Math.min(5, Number(pages) || 1));
      let allCards: any[] = [];
      let nextPage: string | undefined;

      const first = await this.scryfall.searchCards(q, 1);
      allCards = allCards.concat(first.data || []);
      nextPage = first.has_more ? first.next_page : undefined;

      let fetched = 1;
      while (nextPage && fetched < pagesNum) {
        const resp = await (await import('axios')).default.get(nextPage, { timeout: 15000 });
        const payload = resp.data;
        allCards = allCards.concat(payload?.data || []);
        fetched++;
        nextPage = payload?.has_more ? payload?.next_page : undefined;
      }

      const saved = await this.scryfall.saveCards(allCards);
      res.status(200).json({ success: true, count: saved.length });
    } catch (err) {
      console.error('Scryfall save error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /** POST /api/scryfall/ingest — Body: { limit?: number } */
  public async ingest(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 500 } = req.body || {};
      const result = await this.scryfall.ingestAllCards(Math.min(5000, Number(limit) || 500));
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Scryfall ingest error:', err);
      res.status(500).json({ success: false, error: err?.message || 'ingest-failed' });
    }
  }

  /** GET /api/scryfall/cards?q=...&setCode=...&rarity=...&page=...&limit=... */
  public async querySaved(req: Request, res: Response): Promise<void> {
    try {
      const { q, setCode, rarity, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(100, parseInt(limit as string) || 20);
      const skip = (pageNum - 1) * limitNum;

      const filter: any = {};
      if (q && typeof q === 'string') filter.$text = { $search: q };
      if (setCode && typeof setCode === 'string') filter.setCode = setCode.toLowerCase();
      if (rarity && typeof rarity === 'string') filter.rarity = rarity;

      const [cards, total] = await Promise.all([
        CardModel.find(filter)
          .sort(q ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        CardModel.countDocuments(filter)
      ]);

      res.status(200).json({
        success: true,
        cards,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
      });
    } catch (err) {
      console.error('Scryfall query saved error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
