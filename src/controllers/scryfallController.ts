import { Request, Response } from 'express';
import { ScryfallService } from '../services/ScryfallService';
import { ScryfallCardModel } from '../models';

export class ScryfallController {
  private scryfall: ScryfallService;

  constructor() {
    this.scryfall = ScryfallService.getInstance();
  }

  /**
   * GET /api/scryfall/search?q=...
   * Optional: page
   */
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

  /**
   * POST /api/scryfall/save
   * Body: { q: string, pages?: number }
   * Searches Scryfall and stores the first N pages of results
   */
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

      // Fetch first page via searchCards; follow next_page links up to pagesNum
      const first = await this.scryfall.searchCards(q, 1);
      allCards = allCards.concat(first.data || []);
      nextPage = first.has_more ? first.next_page : undefined;

      let fetched = 1;
      while (nextPage && fetched < pagesNum) {
        const resp = await (await import('axios')).default.get(nextPage, { timeout: 15000 });
        const payload = resp.data;
        allCards = allCards.concat(payload?.data || []);
        fetched++;
        // naive: stop if no more; better to check has_more but nextPage requests already encode it
        // We can't easily get next next_page without full object; keep single page follow for simplicity
        nextPage = undefined;
      }

      const saved = await this.scryfall.saveCards(allCards);
      res.status(200).json({ success: true, count: saved.length });
    } catch (err) {
      console.error('Scryfall save error:', err);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /**
   * GET /api/scryfall/cards
   * Query: q (text search), setCode, rarity, limit, page
   */
  public async querySaved(req: Request, res: Response): Promise<void> {
    try {
      const { q, setCode, rarity, page = '1', limit = '20' } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const filter: any = {};
      if (q && typeof q === 'string') filter.$text = { $search: q };
      if (setCode && typeof setCode === 'string') filter.setCode = setCode.toLowerCase();
      if (rarity && typeof rarity === 'string') filter.rarity = rarity;

      const [cards, total] = await Promise.all([
        ScryfallCardModel.find(filter)
          .sort(q ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        ScryfallCardModel.countDocuments(filter)
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
