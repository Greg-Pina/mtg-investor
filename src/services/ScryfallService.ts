import axios from 'axios';
import { ScryfallCardModel, IScryfallCard, CardModel } from '../models';
import { DatabaseAdapter } from '../adapters/database';

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

  /**
   * Search Scryfall cards using their full-text search syntax
   */
  public async searchCards(query: string, page: number = 1): Promise<ScryfallSearchResult> {
    const url = `${this.baseUrl}/cards/search?q=${encodeURIComponent(query)}${page > 1 ? `&page=${page}` : ''}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    return data as ScryfallSearchResult;
  }

  /**
   * Fetch a single card by exact name
   */
  public async getCardByName(name: string): Promise<any> {
    const url = `${this.baseUrl}/cards/named?exact=${encodeURIComponent(name)}`;
    const { data } = await axios.get(url, { timeout: 15000 });
    return data;
  }

  /**
   * Ingest many cards by paging Scryfall search (fallback to avoid huge bulk file streaming).
   * This will become the daily sync job. Use q='*' and iterate pages until limit.
   */
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

  /**
   * Persist Scryfall cards into MongoDB (upsert by scryfallId)
   */
  public async saveCards(cards: any[]): Promise<IScryfallCard[]> {
    const db = DatabaseAdapter.getInstance();
    if (!db.getConnectionStatus()) {
      console.log('Database not connected; skipping save. Returning mapped cards without persistence.');
      // Return mapped objects (not saved) to allow UI to continue
      return cards.map((c) => this.mapToDoc(c) as unknown as IScryfallCard);
    }
    const saved: IScryfallCard[] = [];
    for (const c of cards) {
      const doc = await ScryfallCardModel.findOneAndUpdate(
        { scryfallId: c.id },
        this.mapToDoc(c),
        { upsert: true, new: true }
      );
      if (doc) saved.push(doc);

      // Upsert into canonical Card model
      const base = this.mapToUnifiedDoc(c);
      await CardModel.findOneAndUpdate({ scryfallId: c.id }, base, { upsert: true, new: true });
    }
    return saved;
  }

  /**
   * Map raw Scryfall card to our DB schema
   */
  private mapToDoc(card: any) {
    return {
      scryfallId: card.id,
      name: card.name,
  setCode: card.set,
      setName: card.set_name,
      collectorNumber: card.collector_number,
      layout: card.layout,
      manaCost: card.mana_cost,
      cmc: card.cmc,
      typeLine: card.type_line,
      oracleText: card.oracle_text,
      colors: card.colors,
      colorIdentity: card.color_identity,
      legalities: card.legalities,
      imageUris: card.image_uris,
      prices: card.prices,
      tcgplayerId: card.tcgplayer_id,
      rarity: card.rarity,
      usd: card.prices?.usd,
      usdFoil: card.prices?.usd_foil,
      eur: card.prices?.eur,
      tix: card.prices?.tix,
      raw: card,
      lastUpdated: new Date()
    };
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
