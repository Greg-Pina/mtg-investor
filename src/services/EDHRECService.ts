import axios from 'axios';
import { CardModel } from '../models';
import { logger } from '../utils/logger';

const BASE = 'https://json.edhrec.com/pages';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export interface EDHRECCommanderData {
  commanderRank?: number;
  totalDecks?: number;
  combos?: any[];
  recommendations?: Record<string, any[]>;
}

export interface EDHRECCardData {
  totalDecks?: number;
  recommendations?: Record<string, any[]>;
  combos?: any[];
}

export class EDHRECService {
  private static instance: EDHRECService;

  private constructor() {}

  public static getInstance(): EDHRECService {
    if (!EDHRECService.instance) {
      EDHRECService.instance = new EDHRECService();
    }
    return EDHRECService.instance;
  }

  async getCommanderData(name: string): Promise<EDHRECCommanderData | null> {
    try {
      const slug = toSlug(name);
      const { data } = await axios.get(`${BASE}/commanders/${slug}.json`, { timeout: 15000 });
      return this.parseCommanderPage(data);
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      logger.warn(`[EDHREC] commander fetch failed for "${name}": ${err.message}`);
      return null;
    }
  }

  async getCardData(name: string): Promise<EDHRECCardData | null> {
    try {
      const slug = toSlug(name);
      const { data } = await axios.get(`${BASE}/cards/${slug}.json`, { timeout: 15000 });
      return this.parseCardPage(data);
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      logger.warn(`[EDHREC] card fetch failed for "${name}": ${err.message}`);
      return null;
    }
  }

  async enrichCard(cardName: string): Promise<void> {
    const [commanderData, cardData] = await Promise.all([
      this.getCommanderData(cardName),
      this.getCardData(cardName)
    ]);

    const edhrec: Record<string, any> = { lastFetched: new Date() };

    if (commanderData) {
      edhrec.commanderRank = commanderData.commanderRank;
      edhrec.totalDecks = commanderData.totalDecks;
      edhrec.combos = commanderData.combos;
      edhrec.recommendations = commanderData.recommendations;
    } else if (cardData) {
      edhrec.totalDecks = cardData.totalDecks;
      edhrec.recommendations = cardData.recommendations;
      edhrec.combos = cardData.combos;
    }

    if (commanderData || cardData) {
      await CardModel.updateOne(
        { name: cardName },
        { $set: { edhrec, lastUpdated: new Date() } }
      );
    }
  }

  private parseCommanderPage(page: any): EDHRECCommanderData {
    const container = page?.container;
    const jsonDict = container?.json_dict ?? page?.json_dict ?? {};

    const result: EDHRECCommanderData = {};

    // Try to find rank and deck count
    const header = jsonDict?.header ?? page?.header;
    if (header) {
      result.commanderRank = header.rank;
      result.totalDecks = header.num_decks ?? header.total_decks;
    }

    // Combos
    const combos = jsonDict?.combos ?? page?.combos ?? [];
    if (Array.isArray(combos) && combos.length > 0) {
      result.combos = combos;
    }

    // Recommendations (card lists)
    result.recommendations = this.extractRecommendations(jsonDict);

    return result;
  }

  private parseCardPage(page: any): EDHRECCardData {
    const jsonDict = page?.container?.json_dict ?? page?.json_dict ?? {};
    const result: EDHRECCardData = {};

    const header = jsonDict?.header ?? page?.header;
    if (header) {
      result.totalDecks = header.num_decks ?? header.total_decks;
    }

    const combos = jsonDict?.combos ?? page?.combos ?? [];
    if (Array.isArray(combos) && combos.length > 0) {
      result.combos = combos;
    }

    result.recommendations = this.extractRecommendations(jsonDict);

    return result;
  }

  private extractRecommendations(jsonDict: any): Record<string, any[]> {
    const recs: Record<string, any[]> = {};
    const sections = ['newcards', 'highsynergycards', 'topcards', 'creatures', 'instants', 'sorceries',
      'enchantments', 'artifacts', 'manaartifacts', 'lands', 'battles', 'planeswalkers'];

    for (const section of sections) {
      const cards = jsonDict?.[section]?.cardviews ?? jsonDict?.[section];
      if (Array.isArray(cards) && cards.length > 0) {
        recs[section] = cards;
      }
    }

    return recs;
  }
}
