export interface CardQuery {
  cardName: string;
  setCode?: string;
  collectorNumber?: string;
}

export interface ProviderPricePoint {
  provider: string;
  cardName: string;
  currency: string;
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  sku?: string;
  url?: string;
  updatedAt: string;
  raw: unknown;
}

export interface ProviderError {
  provider: string;
  code: 'CONFIG' | 'AUTH' | 'TIMEOUT' | 'NETWORK' | 'HTTP' | 'PARSE' | 'UNKNOWN';
  message: string;
  status?: number;
  cause?: unknown;
}

export type ProviderResult =
  | { ok: true; data: ProviderPricePoint[] }
  | { ok: false; error: ProviderError };

export interface IFinancialDataProvider {
  readonly providerName: string;
  validateConfig(): void;
  fetchPrices(query: CardQuery): Promise<ProviderResult>;
}
