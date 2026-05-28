import { FinancialSnapshot } from './types';

function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeFinancialSnapshot(card: any): FinancialSnapshot {
  const tcg = card?.tcg?.currentPrice ?? {};
  const prices = card?.prices ?? {};

  return {
    usd: parsePrice(prices.usd),
    usdFoil: parsePrice(prices.usd_foil),
    eur: parsePrice(prices.eur),
    tix: parsePrice(prices.tix),
    market: parsePrice(tcg.market),
    low: parsePrice(tcg.low),
    mid: parsePrice(tcg.mid),
    high: parsePrice(tcg.high),
    capturedAt: (card?.lastUpdated ? new Date(card.lastUpdated) : new Date()).toISOString()
  };
}
