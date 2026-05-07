import { CardQuery, ProviderPricePoint } from '../types';

export function mapManaPoolResponseToPricePoints(payload: any, query: CardQuery): ProviderPricePoint[] {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const now = new Date().toISOString();

  return data.map((entry: any) => ({
    provider: 'manapool',
    cardName: query.cardName,
    currency: entry?.pricing?.currency || 'USD',
    low: numeric(entry?.pricing?.low),
    mid: numeric(entry?.pricing?.mid),
    high: numeric(entry?.pricing?.high),
    market: numeric(entry?.pricing?.market),
    sku: entry?.id,
    url: entry?.link,
    updatedAt: entry?.pricing?.updatedAt || now,
    raw: entry
  }));
}

function numeric(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}
