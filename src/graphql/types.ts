export interface CardFilterInput {
  q?: string;
  setCode?: string;
  rarity?: string;
  page?: number;
  limit?: number;
}

export interface SyncScryfallInput {
  limit?: number;
}

export interface EnrichCardInput {
  name: string;
}

export interface FinancialSnapshot {
  usd?: number | null;
  usdFoil?: number | null;
  eur?: number | null;
  tix?: number | null;
  market?: number | null;
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  capturedAt: string;
}

export interface CardRelationshipCluster {
  key: string;
  label: string;
  cardCount: number;
  cards: any[];
}

export interface GraphQLContext {
  requestId?: string;
}
