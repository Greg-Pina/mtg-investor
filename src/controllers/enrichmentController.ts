import { Request, Response } from 'express';
import { CardModel } from '../models';
import { TCGCSVService, PythonService } from '../services';
import { EDHRECService } from '../services/EDHRECService';

export class EnrichmentController {
  private tcg = TCGCSVService.getInstance();
  private python = PythonService.getInstance();

  /**
   * POST /api/enrich/tcg
   * Body: { names?: string[], limit?: number }
   * Updates CardModel.tcg fields with latest price/productIds.
   */
  public async enrichTCG(req: Request, res: Response): Promise<void> {
    try {
      const { names = [], limit = 50 } = req.body || {};
      let targets = [] as Array<{ _id: any; name: string; scryfallId: string }>;

      if (Array.isArray(names) && names.length > 0) {
        targets = await CardModel.find({ name: { $in: names } }, { _id: 1, name: 1, scryfallId: 1 }).limit(limit).lean();
      } else {
        targets = await CardModel.find({}, { _id: 1, name: 1, scryfallId: 1 }).limit(limit).lean();
      }

      let updated = 0;
      for (const card of targets) {
        try {
          const products = await this.tcg.searchMagicProducts(card.name, 5);
          const productIds = products.map(p => p.productId);
          let currentPrice: any = undefined;
          if (productIds.length > 0) {
            const price = await this.tcg.getProductPrice(productIds[0]);
            if (price) {
              currentPrice = {
                low: price.lowPrice,
                mid: price.midPrice,
                high: price.highPrice,
                market: price.marketPrice
              };
            }
          }

          await CardModel.updateOne({ _id: card._id }, {
            $set: {
              'tcg.productIds': productIds,
              ...(currentPrice ? { 'tcg.currentPrice': currentPrice } : {})
            },
            $currentDate: { lastUpdated: true }
          });
          updated++;
        } catch (e) {
          // continue
        }
      }

      res.json({ success: true, scanned: targets.length, updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'tcg-enrich-failed' });
    }
  }

  /**
   * POST /api/enrich/edhrec
   * Body: { names: string[] }
   * Enriches cards via Node-native EDHRECService, falling back to Python subprocess.
   */
  public async enrichEDHREC(req: Request, res: Response): Promise<void> {
    try {
      const { names } = req.body || {};
      if (!Array.isArray(names) || names.length === 0) {
        res.status(400).json({ success: false, error: 'names[] required' });
        return;
      }

      const edhrec = EDHRECService.getInstance();
      const cards = await CardModel.find({ name: { $in: names } }, { _id: 1, name: 1, scryfallId: 1 }).lean();
      let updated = 0;

      for (const card of cards) {
        try {
          await edhrec.enrichCard(card.name);
          updated++;
        } catch {
          try {
            const result = await this.python.executeScript({ card_name: card.name }, { scriptName: 'advanced_processor.py', timeout: 60000 });
            if (result.success && result.output) {
              await CardModel.updateOne({ _id: card._id }, {
                $set: { edhrec: result.output },
                $currentDate: { lastUpdated: true }
              });
              updated++;
            }
          } catch {
            // continue
          }
        }
      }

      res.json({ success: true, scanned: cards.length, updated });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || 'edhrec-enrich-failed' });
    }
  }
}
