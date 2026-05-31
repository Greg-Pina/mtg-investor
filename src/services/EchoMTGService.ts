import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import { CollectionCard, EchoCondition, EchoLanguage, ICollectionCard } from '../models/CollectionCard';

const BASE_URL = 'https://api.echomtg.com/api';

// Condition string normalization — maps common scanner/app output to EchoMTG codes
const CONDITION_MAP: Record<string, EchoCondition> = {
  'near mint': 'NM', 'nm': 'NM', 'mint': 'NM',
  'lightly played': 'LP', 'lp': 'LP', 'excellent': 'LP',
  'moderately played': 'MP', 'mp': 'MP', 'good': 'LP', 'played': 'MP',
  'heavily played': 'HP', 'hp': 'HP', 'poor': 'HP',
  'damaged': 'D', 'dmg': 'D', 'd': 'D',
  'altered': 'ALT', 'alt': 'ALT',
};

const LANGUAGE_MAP: Record<string, EchoLanguage> = {
  'english': 'EN', 'en': 'EN',
  'german': 'DE', 'de': 'DE',
  'french': 'FR', 'fr': 'FR',
  'russian': 'RU', 'ru': 'RU',
  'italian': 'IT', 'it': 'IT',
  'spanish': 'ES', 'es': 'ES',
  'portuguese': 'PT', 'pt': 'PT',
  'chinese traditional': 'CT', 'ct': 'CT', 'traditional chinese': 'CT',
  'chinese simplified': 'CS', 'cs': 'CS', 'simplified chinese': 'CS',
  'japanese': 'JP', 'jp': 'JP',
  'korean': 'KR', 'kr': 'KR',
};

export interface EchoCardData {
  id: string;
  card_name: string;
  set_code: string;
  expansion: string;
  tcgplayer_id?: string;
  tcg_low?: string;
  tcg_mid?: string;
  tcg_market?: string;
  tcg_high?: string;
  foil_price?: string;
  last_updated?: string;
}

export interface EchoInventoryItem {
  inventory_id: number;
  emid: number;
  quantity: number;
  condition: string;
  language: string;
  foil: number;
  acquired_price?: string;
  acquired_date?: string;
  card: EchoCardData;
}

export interface EchoAddResponse {
  status: string;
  message: string;
  inventory_id: number;
  card: EchoCardData;
}

export interface EchoQuickStats {
  total_value?: number;
  total_cards?: number;
  unique_cards?: number;
}

class EchoMTGService {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt: number = 0;
  // In-memory set data cache to avoid repeated set fetches
  private setCache: Map<string, Map<string, number>> = new Map();

  constructor() {
    this.client = axios.create({ baseURL: BASE_URL, timeout: 15000 });
    // Inject auth header on every request
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getToken();
      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });
  }

  // ─── Authentication ────────────────────────────────────────────────────────

  private async getToken(): Promise<string | null> {
    // Static token takes priority
    if (process.env.ECHO_MTG_TOKEN) return process.env.ECHO_MTG_TOKEN;

    // Auto-refresh if token missing or expiring within 30 min
    const now = Date.now();
    if (this.token && now < this.tokenExpiresAt - 30 * 60 * 1000) return this.token;

    const email = process.env.ECHO_MTG_EMAIL;
    const password = process.env.ECHO_MTG_PASSWORD;
    if (!email || !password) return null;

    try {
      const res = await axios.post(`${BASE_URL}/auth/login/`, { email, password });
      this.token = res.data?.token ?? null;
      // Token expires in 24 hours
      this.tokenExpiresAt = now + 24 * 60 * 60 * 1000;
      return this.token;
    } catch (err) {
      logger.error('EchoMTG login failed', { err });
      return null;
    }
  }

  isConfigured(): boolean {
    return !!(process.env.ECHO_MTG_TOKEN || (process.env.ECHO_MTG_EMAIL && process.env.ECHO_MTG_PASSWORD));
  }

  // ─── emid Resolution ──────────────────────────────────────────────────────

  normalizeCondition(raw: string): EchoCondition {
    return CONDITION_MAP[raw.toLowerCase()] ?? (raw.toUpperCase() as EchoCondition) ?? 'NM';
  }

  normalizeLanguage(raw: string): EchoLanguage {
    return LANGUAGE_MAP[raw.toLowerCase()] ?? (raw.toUpperCase() as EchoLanguage) ?? 'EN';
  }

  async lookupEmid(name: string, setCode: string): Promise<number | null> {
    // Check local set cache first
    const cached = this.setCache.get(setCode.toUpperCase())?.get(name.toLowerCase());
    if (cached) return cached;

    try {
      const res = await this.client.get('/data/search/', { params: { card: name, set: setCode } });
      const items: EchoCardData[] = res.data?.data ?? [];
      const match = items.find(c => c.card_name.toLowerCase() === name.toLowerCase());
      if (match) return parseInt(match.id, 10);
    } catch (err) {
      logger.warn('EchoMTG emid lookup failed', { name, setCode, err });
    }
    return null;
  }

  async fetchSetEmids(setCode: string): Promise<Map<string, number>> {
    const cached = this.setCache.get(setCode.toUpperCase());
    if (cached) return cached;

    const nameToEmid = new Map<string, number>();
    try {
      let start = 0;
      while (true) {
        const res = await this.client.get('/data/set/', { params: { set_code: setCode, minified: true, start, limit: 500 } });
        const cards: EchoCardData[] = res.data?.data ?? [];
        if (!cards.length) break;
        for (const card of cards) nameToEmid.set(card.card_name.toLowerCase(), parseInt(card.id, 10));
        if (cards.length < 500) break;
        start += 500;
      }
      this.setCache.set(setCode.toUpperCase(), nameToEmid);
    } catch (err) {
      logger.warn('EchoMTG set fetch failed', { setCode, err });
    }
    return nameToEmid;
  }

  // ─── CSV emid Resolution (bulk fast path) ─────────────────────────────────

  async resolveEmidsFromCsv(buffer: Buffer, filename: string): Promise<Record<string, number>> {
    if (!this.isConfigured()) return {};
    try {
      const form = new FormData();
      form.append('file', buffer, { filename, contentType: 'text/csv' });
      const res = await this.client.post('/import/csv/', form, { headers: form.getHeaders() });
      const mapping: Record<string, number> = {};
      const rows: Array<{ card_name: string; emid: number }> = res.data?.data ?? [];
      for (const row of rows) {
        if (row.card_name && row.emid) mapping[row.card_name.toLowerCase()] = row.emid;
      }
      return mapping;
    } catch (err) {
      logger.warn('EchoMTG CSV emid resolution failed — continuing without emids', { err });
      return {};
    }
  }

  // ─── Inventory CRUD ───────────────────────────────────────────────────────

  async addCard(card: Partial<ICollectionCard>): Promise<EchoAddResponse | null> {
    if (!this.isConfigured() || !card.emid) return null;
    try {
      const res = await this.client.post('/inventory/add/', {
        emid: card.emid,
        quantity: card.quantity ?? 1,
        language: card.language ?? 'EN',
        condition: card.condition ?? 'NM',
        foil: card.isFoil ? 1 : 0,
        acquired_price: card.acquisitionPrice?.toString(),
        acquired_date: card.acquisitionDate
          ? card.acquisitionDate.toISOString().split('T')[0]
          : undefined,
      });
      return res.data;
    } catch (err) {
      logger.error('EchoMTG addCard failed', { name: card.name, err });
      return null;
    }
  }

  async addBatch(cards: Partial<ICollectionCard>[]): Promise<void> {
    if (!this.isConfigured()) return;
    const eligible = cards.filter(c => c.emid);
    if (!eligible.length) return;

    // Batch endpoint accepts an array; process in chunks of 100 to avoid payload limits
    const CHUNK = 100;
    for (let i = 0; i < eligible.length; i += CHUNK) {
      const chunk = eligible.slice(i, i + CHUNK);
      try {
        const payload = chunk.map(c => ({
          emid: c.emid,
          quantity: c.quantity ?? 1,
          language: c.language ?? 'EN',
          condition: c.condition ?? 'NM',
          foil: c.isFoil ? 1 : 0,
          acquired_price: c.acquisitionPrice?.toString(),
        }));
        const res = await this.client.post('/inventory/add-batch/', payload);
        const results: Array<{ inventory_id: number; emid: number }> = res.data?.data ?? [];
        // Store inventory_ids back on MongoDB records
        for (const result of results) {
          if (result.inventory_id && result.emid) {
            await CollectionCard.updateOne(
              { emid: result.emid },
              { $set: { echoInventoryId: result.inventory_id, lastSyncedAt: new Date() } }
            );
          }
        }
      } catch (err) {
        logger.error('EchoMTG addBatch chunk failed', { chunkStart: i, err });
      }
      // Rate limit: 200ms between chunks
      if (i + CHUNK < eligible.length) await new Promise(r => setTimeout(r, 200));
    }
  }

  async updateCard(echoInventoryId: number, patch: {
    quantity?: number;
    condition?: EchoCondition;
    language?: EchoLanguage;
    tradable?: boolean;
    acquired_price?: string;
  }): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.client.post('/inventory/update/', {
        id: echoInventoryId,
        ...patch,
        tradable: patch.tradable !== undefined ? (patch.tradable ? 1 : 0) : undefined,
      });
    } catch (err) {
      logger.error('EchoMTG updateCard failed', { echoInventoryId, err });
    }
  }

  async deleteCard(echoInventoryId: number): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.client.post('/inventory/remove/', { id: echoInventoryId });
    } catch (err) {
      logger.error('EchoMTG deleteCard failed', { echoInventoryId, err });
    }
  }

  // ─── Full Collection Sync (Echo → MongoDB) ────────────────────────────────

  async fetchCollection(): Promise<void> {
    if (!this.isConfigured()) return;
    logger.info('EchoMTG: starting full collection fetch');
    let start = 0;
    const limit = 250;
    let total = 0;

    while (true) {
      try {
        const res = await this.client.get('/inventory/view/', { params: { start, limit, sort: 'name', direction: 'ASC' } });
        const items: EchoInventoryItem[] = res.data?.data ?? [];
        if (!items.length) break;

        for (const item of items) {
          const prices = this.extractPrices(item.card);
          await CollectionCard.findOneAndUpdate(
            { echoInventoryId: item.inventory_id },
            {
              $set: {
                echoInventoryId: item.inventory_id,
                emid: item.emid,
                name: item.card.card_name,
                setCode: item.card.set_code,
                expansion: item.card.expansion,
                tcgplayerId: item.card.tcgplayer_id ? parseInt(item.card.tcgplayer_id, 10) : undefined,
                isFoil: item.foil === 1,
                condition: this.normalizeCondition(item.condition),
                quantity: item.quantity,
                language: this.normalizeLanguage(item.language),
                status: 'In Collection',
                acquisitionPrice: item.acquired_price ? parseFloat(item.acquired_price) : undefined,
                source: 'echomtg',
                echoPrices: prices,
                lastSyncedAt: new Date(),
              },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true, new: true }
          );
          total++;
        }

        if (items.length < limit) break;
        start += limit;
      } catch (err) {
        logger.error('EchoMTG fetchCollection page failed', { start, err });
        break;
      }
    }

    logger.info('EchoMTG: collection fetch complete', { total });
  }

  // ─── Earnings (Sold Cards) ────────────────────────────────────────────────

  async recordSale(params: {
    emid: number;
    acquiredPrice: string;
    soldPrice: string;
    quantity?: number;
    condition?: EchoCondition;
    language?: EchoLanguage;
    foil?: boolean;
  }): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.client.post('/earnings/add/', {
        emid: params.emid,
        acquired_price: params.acquiredPrice,
        sold_price: params.soldPrice,
        quantity: params.quantity ?? 1,
        condition: params.condition ?? 'NM',
        language: params.language ?? 'EN',
        foil: params.foil ? 1 : 0,
      });
    } catch (err) {
      logger.error('EchoMTG recordSale failed', { emid: params.emid, err });
    }
  }

  // ─── Statistics ───────────────────────────────────────────────────────────

  async getQuickStats(): Promise<EchoQuickStats | null> {
    if (!this.isConfigured()) return null;
    try {
      const res = await this.client.get('/inventory/quickstats/');
      return res.data?.data ?? null;
    } catch (err) {
      logger.warn('EchoMTG quickstats failed', { err });
      return null;
    }
  }

  async getFullStats(): Promise<Record<string, unknown> | null> {
    if (!this.isConfigured()) return null;
    try {
      const res = await this.client.get('/inventory/stats/');
      return res.data?.data ?? null;
    } catch (err) {
      logger.warn('EchoMTG fullStats failed', { err });
      return null;
    }
  }

  // ─── Card Data ────────────────────────────────────────────────────────────

  async getCardData(emid: number): Promise<EchoCardData | null> {
    try {
      const res = await this.client.get('/data/item/', { params: { emid } });
      return res.data?.data ?? null;
    } catch (err) {
      logger.warn('EchoMTG getCardData failed', { emid, err });
      return null;
    }
  }

  // ─── Future Stubs (available for expansion) ───────────────────────────────

  async addToWantList(_emid: number, _options?: { foil?: boolean; count?: number; priority?: number }): Promise<void> {
    logger.info('EchoMTG addToWantList: not yet implemented');
  }

  async addToWatchlist(_emid: number, _options?: { foil?: boolean; threshold?: number }): Promise<void> {
    logger.info('EchoMTG addToWatchlist: not yet implemented');
  }

  async addNote(_inventoryId: number, _note: string): Promise<void> {
    logger.info('EchoMTG addNote: not yet implemented');
  }

  async parseDeckText(_text: string): Promise<unknown> {
    logger.info('EchoMTG parseDeckText: not yet implemented');
    return null;
  }

  async getEarningsStats(): Promise<unknown> {
    logger.info('EchoMTG getEarningsStats: not yet implemented');
    return null;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private extractPrices(card: EchoCardData) {
    return {
      tcgLow: card.tcg_low ? parseFloat(card.tcg_low) : undefined,
      tcgMid: card.tcg_mid ? parseFloat(card.tcg_mid) : undefined,
      tcgMarket: card.tcg_market ? parseFloat(card.tcg_market) : undefined,
      tcgHigh: card.tcg_high ? parseFloat(card.tcg_high) : undefined,
      foilPrice: card.foil_price ? parseFloat(card.foil_price) : undefined,
      lastUpdated: card.last_updated ? new Date(card.last_updated) : new Date(),
    };
  }
}

export const echoMTGService = new EchoMTGService();
