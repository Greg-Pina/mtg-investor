import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { CollectionCard } from '../models/CollectionCard';
import { ImportJob } from '../models/ImportJob';
import { CardModel as Card, ICard } from '../models/Card';
import { echoMTGService } from '../services/EchoMTGService';
import { collectionImportService, subscribeToProgress } from '../services/CollectionImportService';
import { generateMarketUrls } from '../utils/marketplaceLinks';
import { logger } from '../utils/logger';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const VALID_STATUSES = ['In Collection', 'Listed for Sale', 'Sold'];
const VALID_CONDITIONS = ['NM','LP','MP','HP','D','ALT','ART','PRE','TS','SGN','BGS','B10','B95','B9','B85','B8','B75','B7','PSA','P10','P95','P9','P85','P8','P75','P7','CGC','C10P','C10','C95','C9','C85','C8','C75','C7','PCG','PC10','PC95','PC9','PC85','PC8','PC75','PC7'];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
});

// ─── Collection CRUD ──────────────────────────────────────────────────────────

export async function getCollection(req: Request, res: Response): Promise<void> {
  try {
    const rawStatus = typeof req.query.status === 'string' ? req.query.status : '';
    const rawSource = typeof req.query.source === 'string' ? req.query.source : '';
    const rawCondition = typeof req.query.condition === 'string' ? req.query.condition : '';
    const rawIsFoil = typeof req.query.isFoil === 'string' ? req.query.isFoil : '';
    const rawQ = typeof req.query.q === 'string' ? req.query.q : '';
    const page = typeof req.query.page === 'string' ? req.query.page : '1';
    const limit = typeof req.query.limit === 'string' ? req.query.limit : '50';

    const filter: Record<string, unknown> = {};
    if (rawStatus && VALID_STATUSES.includes(rawStatus)) filter.status = rawStatus;
    if (rawSource) filter.source = rawSource;
    if (rawCondition && VALID_CONDITIONS.includes(rawCondition)) filter.condition = rawCondition;
    if (rawIsFoil) filter.isFoil = rawIsFoil === 'true';
    if (rawQ) filter.name = new RegExp(escapeRegex(rawQ), 'i');

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [cards, total] = await Promise.all([
      CollectionCard.find(filter).sort({ name: 1 }).skip(skip).limit(limitNum).lean(),
      CollectionCard.countDocuments(filter),
    ]);

    res.json({ cards, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    logger.error('getCollection error', { err });
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
}

export async function addCard(req: Request, res: Response): Promise<void> {
  try {
    const card = await CollectionCard.create({ ...req.body, source: req.body.source ?? 'manual' });

    // Fire-and-forget Echo sync if emid available
    if (card.emid) {
      setImmediate(async () => {
        const result = await echoMTGService.addCard(card);
        if (result?.inventory_id) {
          await CollectionCard.updateOne({ _id: card._id }, { $set: { echoInventoryId: result.inventory_id, lastSyncedAt: new Date() } });
        }
      });
    }

    res.status(201).json(card);
  } catch (err: any) {
    logger.error('addCard error', { err });
    res.status(400).json({ error: err.message });
  }
}

export async function updateCard(req: Request, res: Response): Promise<void> {
  try {
    const card = await CollectionCard.findById(req.params.id);
    if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

    const { soldPrice, ...patch } = req.body;
    const wasSold = patch.status === 'Sold' && card.status !== 'Sold';

    Object.assign(card, patch);
    await card.save();

    // Echo sync
    if (card.echoInventoryId) {
      setImmediate(async () => {
        if (wasSold && card.emid && card.acquisitionPrice && soldPrice) {
          await echoMTGService.recordSale({
            emid: card.emid!,
            acquiredPrice: card.acquisitionPrice!.toString(),
            soldPrice: soldPrice.toString(),
            quantity: card.quantity,
            condition: card.condition,
            language: card.language,
            foil: card.isFoil,
          });
        } else {
          await echoMTGService.updateCard(card.echoInventoryId!, {
            quantity: card.quantity,
            condition: card.condition,
            language: card.language,
          });
        }
      });
    }

    res.json(card);
  } catch (err: any) {
    logger.error('updateCard error', { err });
    res.status(400).json({ error: err.message });
  }
}

export async function deleteCard(req: Request, res: Response): Promise<void> {
  try {
    const card = await CollectionCard.findByIdAndDelete(req.params.id);
    if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

    if (card.echoInventoryId) {
      setImmediate(() => echoMTGService.deleteCard(card.echoInventoryId!));
    }

    res.json({ deleted: true });
  } catch (err) {
    logger.error('deleteCard error', { err });
    res.status(500).json({ error: 'Failed to delete card' });
  }
}

// ─── Import ────────────────────────────────────────────────────────────────

export async function previewImport(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const preview = await collectionImportService.preview(req.file.buffer, req.body.source);
    res.json(preview);
  } catch (err: any) {
    logger.error('previewImport error', { err });
    res.status(400).json({ error: err.message });
  }
}

export async function commitImport(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const result = await collectionImportService.commit(
      req.file.buffer,
      req.file.originalname,
      { mergeStrategy: req.body.mergeStrategy, sourceOverride: req.body.source }
    );
    res.json(result);
  } catch (err: any) {
    logger.error('commitImport error', { err });
    res.status(400).json({ error: err.message });
  }
}

export function importProgress(req: Request, res: Response): void {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  subscribeToProgress(jobId, res);

  // Heartbeat every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 15000);
  res.on('close', () => clearInterval(heartbeat));
}

export async function getImportHistory(req: Request, res: Response): Promise<void> {
  try {
    const jobs = await ImportJob.find().sort({ createdAt: -1 }).limit(10).lean();
    res.json(jobs);
  } catch (err) {
    logger.error('getImportHistory error', { err });
    res.status(500).json({ error: 'Failed to fetch import history' });
  }
}

// ─── Echo Sync ─────────────────────────────────────────────────────────────

export async function syncFromEcho(req: Request, res: Response): Promise<void> {
  try {
    if (!echoMTGService.isConfigured()) {
      res.status(400).json({ error: 'EchoMTG not configured — set ECHO_MTG_TOKEN or ECHO_MTG_EMAIL/PASSWORD' });
      return;
    }
    res.json({ status: 'sync started' });
    // Run in background so response doesn't hang
    setImmediate(async () => {
      try { await echoMTGService.fetchCollection(); }
      catch (err) { logger.error('Echo sync failed', { err }); }
    });
  } catch (err) {
    logger.error('syncFromEcho error', { err });
    res.status(500).json({ error: 'Sync failed' });
  }
}

// ─── Portfolio ─────────────────────────────────────────────────────────────

export async function getPortfolio(req: Request, res: Response): Promise<void> {
  try {
    const ownedCards = await CollectionCard.find({
      status: { $in: ['In Collection', 'Listed for Sale'] },
    }).lean();

    // Enrich owned cards with gold-layer investment data
    const scryfallIds = ownedCards.map(c => c.scryfallId).filter(Boolean) as string[];
    const enrichedCards = await Card.find({ scryfallId: { $in: scryfallIds } }, {
      scryfallId: 1, investmentScore: 1, investmentSignals: 1, priceHistory: 1, prices: 1,
    }).lean<ICard[]>();
    const enrichMap = new Map(enrichedCards.map((c: ICard) => [c.scryfallId, c]));

    let portfolioValue = 0;
    let totalQuantity = 0;
    const annotated = ownedCards.map(card => {
      const gold = card.scryfallId ? enrichMap.get(card.scryfallId) : undefined;
      const marketPrice = card.echoPrices?.tcgMarket ?? 0;
      const cardValue = marketPrice * card.quantity;
      portfolioValue += cardValue;
      totalQuantity += card.quantity;
      return {
        ...card,
        investmentScore: gold?.investmentScore,
        investmentSignals: gold?.investmentSignals ?? [],
        currentMarketPrice: marketPrice,
        currentValue: cardValue,
        unrealizedGain: card.acquisitionPrice != null
          ? (marketPrice - card.acquisitionPrice) * card.quantity
          : undefined,
      };
    }).sort((a, b) => (b.investmentScore ?? 0) - (a.investmentScore ?? 0));

    // Top unowned opportunities (top 10 scored cards not in collection)
    const ownedScryfallIds = new Set(scryfallIds);
    const topOpportunities = await Card.find(
      { scryfallId: { $nin: Array.from(ownedScryfallIds) }, investmentScore: { $gt: 0 } },
      { name: 1, setCode: 1, scryfallId: 1, investmentScore: 1, investmentSignals: 1, prices: 1 }
    ).sort({ investmentScore: -1 }).limit(10).lean();

    // Echo stats if available
    const echoStats = await echoMTGService.getQuickStats();

    res.json({
      portfolioValue,
      totalCards: totalQuantity,
      uniqueCards: ownedCards.length,
      echoStats,
      ownedCards: annotated,
      topOpportunities,
    });
  } catch (err) {
    logger.error('getPortfolio error', { err });
    res.status(500).json({ error: 'Failed to build portfolio' });
  }
}

// ─── Public Store ──────────────────────────────────────────────────────────

export async function getStoreListings(req: Request, res: Response): Promise<void> {
  try {
    const listed = await CollectionCard.find({ status: 'Listed for Sale' })
      .sort({ name: 1 })
      .lean();

    const listings = listed.map(card => ({
      ...card,
      marketUrls: generateMarketUrls(card.name, card.setCode),
    }));

    res.json(listings);
  } catch (err) {
    logger.error('getStoreListings error', { err });
    res.status(500).json({ error: 'Failed to fetch store listings' });
  }
}
