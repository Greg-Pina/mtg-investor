import axios from 'axios';
import { CardModel, ICard } from '../models';
import { DatabaseAdapter } from '../adapters/database';
import { CacheService } from './CacheService';

export interface ScryfallSearchResult {
  object: string;
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
  data: any[];
}

export class ScryfallService {
  private static instance: ScryfallService;
  private readonly baseUrl = 'https://api.scryfall.com';

  private constructor() {}

  public static getInstance(): ScryfallService {
    if (!ScryfallService.instance) {
      ScryfallService.instance = new ScryfallService();
    }
    return ScryfallService.instance;
  }

  public async searchCards(query: string, page: number = 1): Promise<ScryfallSearchResult> {
    const url = `${this.baseUrl}/cards/search?q=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    return data as ScryfallSearchResult;
  }

  public async getCardByName(name: string): Promise<any> {
    const cache = CacheService.getInstance();
    const cacheKey = `scryfall:card:${name}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const url = `${this.baseUrl}/cards/named?exact=${encodeURIComponent(name)}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    await cache.set(cacheKey, data, 86400); // 24h TTL
    return data;
  }

  public async ingestAllCards(limit: number = 1000): Promise<{ saved: number }> {
    let page = 1;
    let totalSaved = 0;
    let hasMore = true;
    const seenIds = new Set<string>();

    while (hasMore && totalSaved < limit) {
      const url = `${this.baseUrl}/cards/search?q=*&order=set&unique=prints&page=${page}`;
      const { data } = await axios.get(url, { timeout: 20000 });
      const result = data as ScryfallSearchResult;
      const batch = (result.data || []).filter((c: any) => !seenIds.has(c.id));

      const toSave = batch.slice(0, Math.max(0, limit - totalSaved));
      await this.saveCards(toSave);
      toSave.forEach((c: any) => seenIds.add(c.id));
      totalSaved += toSave.length;

      hasMore = !!result.has_more && totalSaved < limit;
      page += 1;
      if (!result.has_more) break;
    }

    return { saved: totalSaved };
  }

  public async saveCards(cards: any[]): Promise<ICard[]> {
    const db = DatabaseAdapter.getInstance();
    if (!db.getConnectionStatus()) {
      return cards.map((c) => this.mapToUnifiedDoc(c) as unknown as ICard);
    }
    const saved: ICard[] = [];
    for (const c of cards) {
      const doc = await CardModel.findOneAndUpdate(
        { scryfallId: c.id },
        this.mapToUnifiedDoc(c),
        { upsert: true, new: true }
      );
      if (doc) saved.push(doc);
    }
    return saved;
  }

  private mapToUnifiedDoc(card: any) {
    return {
      scryfallId: card.id,
      name: card.name,
      setCode: card.set,
      setName: card.set_name,
      collectorNumber: card.collector_number,
      typeLine: card.type_line,
      oracleText: card.oracle_text,
      colors: card.colors,
      rarity: card.rarity,
      imageUris: card.image_uris,
      prices: card.prices,
      tcgplayerId: card.tcgplayer_id,
      scryfall: card,
      lastUpdated: new Date()
    };
  }
}
