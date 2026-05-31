import { CardModel } from '../models';
import { normalizeFinancialSnapshot } from '../utils/financial';
import { CardFilterInput, CardRelationshipCluster, FinancialSnapshot } from '../types/cards';
import { EDHRECService } from './EDHRECService';

export class CardDataPipelineService {
  private static instance: CardDataPipelineService;

  public static getInstance(): CardDataPipelineService {
    if (!CardDataPipelineService.instance) {
      CardDataPipelineService.instance = new CardDataPipelineService();
    }
    return CardDataPipelineService.instance;
  }

  public async getCards(filter: CardFilterInput) {
    const page = Math.max(1, Number(filter.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(filter.limit ?? 20)));
    const skip = (page - 1) * limit;

    const query: any = {};
    if (filter.q) query.$text = { $search: filter.q };
    if (filter.setCode) query.setCode = filter.setCode.toLowerCase();
    if (filter.rarity) query.rarity = filter.rarity;

    const [cards, total] = await Promise.all([
      CardModel.find(query)
        .sort(filter.q ? { score: { $meta: 'textScore' } } : { updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CardModel.countDocuments(query)
    ]);

    return { cards, total, page, limit };
  }

  public async getCard(name: string) {
    return CardModel.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
  }

  public getFinancialSnapshot(card: any): FinancialSnapshot {
    return normalizeFinancialSnapshot(card);
  }

  public async getClusters(limitPerCluster: number = 10): Promise<CardRelationshipCluster[]> {
    const pipeline: any[] = [
      { $match: { setCode: { $exists: true, $ne: null } } },
      { $group: { _id: '$setCode', cardCount: { $sum: 1 }, cards: { $push: '$$ROOT' } } },
      { $sort: { cardCount: -1 as const } },
      { $limit: 20 }
    ];
    const groups = await CardModel.aggregate(pipeline);
    return groups.map((group: any) => ({
      key: group._id,
      label: `Set ${String(group._id).toUpperCase()}`,
      cardCount: group.cardCount,
      cards: group.cards.slice(0, limitPerCluster)
    }));
  }

  public async enrichCard(name: string): Promise<boolean> {
    try {
      await EDHRECService.getInstance().enrichCard(name);
      return true;
    } catch {
      return false;
    }
  }
}
