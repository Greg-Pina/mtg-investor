import { CardModel } from '../models';
import { ManaPoolProvider } from './providers/ManaPoolProvider';
import { TCGPlayerProvider } from './providers/TCGPlayerProvider';
import { TOAMagicProvider } from './providers/TOAMagicProvider';
import { CardQuery, IFinancialDataProvider, ProviderError, ProviderPricePoint } from './providers/types';

export interface EnrichmentResult {
  scanned: number;
  updated: number;
  providerFailures: ProviderError[];
}

export class CardDataPipelineService {
  private providers: IFinancialDataProvider[];

  constructor(providers?: IFinancialDataProvider[]) {
    this.providers = providers ?? [new TCGPlayerProvider(), new ManaPoolProvider(), new TOAMagicProvider()];
  }

  async enrichCardFinancials(names: string[], limit = 50): Promise<EnrichmentResult> {
    const cards = await CardModel.find({ name: { $in: names } }, { _id: 1, name: 1 }).limit(limit).lean();
    const providerFailures: ProviderError[] = [];
    let updated = 0;

    for (const card of cards) {
      const query: CardQuery = { cardName: card.name };
      const settled = await Promise.allSettled(this.providers.map(p => p.fetchPrices(query)));

      const mergedPoints: ProviderPricePoint[] = [];
      for (const res of settled) {
        if (res.status === 'fulfilled') {
          if (res.value.ok) mergedPoints.push(...res.value.data);
          else providerFailures.push(res.value.error);
        } else {
          providerFailures.push({
            provider: 'unknown',
            code: 'UNKNOWN',
            message: res.reason instanceof Error ? res.reason.message : 'Uncaught provider failure',
            cause: res.reason
          });
        }
      }

      if (mergedPoints.length > 0) {
        await CardModel.updateOne(
          { _id: card._id },
          { $set: { 'financial.providers': mergedPoints }, $currentDate: { lastUpdated: true } }
        );
        updated++;
      }
    }

    return { scanned: cards.length, updated, providerFailures };
  }
}
