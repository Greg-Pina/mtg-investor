import { CardQuery, ProviderPricePoint } from '../types';

export function mapTCGPlayerResponseToPricePoints(payload: any, query: CardQuery): ProviderPricePoint[] {
  const now = new Date().toISOString();
  const results = Array.isArray(payload?.results) ? payload.results : [];

  return results.map((item: any) => ({
    provider: 'tcgplayer',
    cardName: query.cardName,
    currency: item?.currency || 'USD',
    low: toNumber(item?.lowPrice),
    mid: toNumber(item?.midPrice),
    high: toNumber(item?.highPrice),
    market: toNumber(item?.marketPrice),
    sku: item?.sku ? String(item.sku) : undefined,
    url: item?.url,
    updatedAt: item?.updatedAt || now,
    raw: item
  }));
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return undefined;
}
