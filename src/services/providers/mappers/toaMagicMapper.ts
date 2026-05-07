import { CardQuery, ProviderPricePoint } from '../types';

export function mapTOAMagicResponseToPricePoints(payload: any, query: CardQuery): ProviderPricePoint[] {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const now = new Date().toISOString();

  return items.map((item: any) => ({
    provider: 'toamagic',
    cardName: query.cardName,
    currency: item?.currencyCode || 'USD',
    low: num(item?.priceLow),
    mid: num(item?.priceMid),
    high: num(item?.priceHigh),
    market: num(item?.priceMarket),
    sku: item?.variantSku || item?.sku,
    url: item?.productUrl,
    updatedAt: item?.updatedAt || now,
    raw: item
  }));
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.length) return Number(v);
  return undefined;
}
