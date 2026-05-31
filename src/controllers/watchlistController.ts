import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WatchlistModel } from '../models/Watchlist';
import { CardModel } from '../models';

export class WatchlistController {
  /** GET /api/watchlist?sessionId=... */
  public async list(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId required' });
        return;
      }
      const items = await WatchlistModel.find({ sessionId })
        .populate('cardId', 'name scryfallId imageUris prices investmentScore rarity')
        .sort({ addedAt: -1 })
        .lean();
      res.json({ success: true, items });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /** POST /api/watchlist — Body: { sessionId, cardId, targetPrice?, notes? } */
  public async add(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, cardId, targetPrice, notes } = req.body || {};
      if (!sessionId || !cardId || typeof sessionId !== 'string' || typeof cardId !== 'string') {
        res.status(400).json({ success: false, error: 'sessionId and cardId required' });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(cardId)) {
        res.status(400).json({ success: false, error: 'Invalid cardId' });
        return;
      }
      const card = await CardModel.findById(cardId).lean();
      if (!card) {
        res.status(404).json({ success: false, error: 'Card not found' });
        return;
      }
      const item = await WatchlistModel.findOneAndUpdate(
        { sessionId, cardId },
        { sessionId, cardId, targetPrice, notes, addedAt: new Date() },
        { upsert: true, new: true }
      );
      res.status(201).json({ success: true, item });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  /** DELETE /api/watchlist/:id?sessionId=... */
  public async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
      if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId required' });
        return;
      }
      const deleted = await WatchlistModel.findOneAndDelete({ _id: id, sessionId });
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Item not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
