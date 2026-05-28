import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceSnapshot {
  date: Date;
  usd?: number;
  usdFoil?: number;
  market?: number;
  source: 'scryfall' | 'tcgplayer' | 'manapool';
}

export interface IEDHRECData {
  commanderRank?: number;
  totalDecks?: number;
  combos?: any[];
  recommendations?: Record<string, any[]>;
  lastFetched?: Date;
}

export interface ICard extends Document {
  scryfallId: string;
  name: string;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  typeLine?: string;
  oracleText?: string;
  colors?: string[];
  rarity?: string;
  imageUris?: Record<string, string>;
  prices?: Record<string, string | null>;

  tcgplayerId?: number;

  // Provider data
  scryfall?: any;
  edhrec?: IEDHRECData;
  tcg?: {
    currentPrice?: {
      usd?: number; usdFoil?: number; market?: number; low?: number; mid?: number; high?: number;
    };
    history?: Array<{ date: Date; marketPrice?: number; lowPrice?: number; highPrice?: number }>;
    productIds?: number[];
  };

  // Price history snapshots across all providers
  priceHistory?: IPriceSnapshot[];

  // Investment scoring
  investmentScore?: number;
  investmentSignals?: string[];

  lastUpdated: Date;
}

const priceSnapshotSchema = new Schema<IPriceSnapshot>({
  date: { type: Date, required: true },
  usd: Number,
  usdFoil: Number,
  market: Number,
  source: { type: String, enum: ['scryfall', 'tcgplayer', 'manapool'], required: true }
}, { _id: false });

const edhrecSchema = new Schema<IEDHRECData>({
  commanderRank: Number,
  totalDecks: Number,
  combos: [Schema.Types.Mixed],
  recommendations: Schema.Types.Mixed,
  lastFetched: Date
}, { _id: false });

const cardSchema = new Schema<ICard>({
  scryfallId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  setCode: String,
  setName: String,
  collectorNumber: String,
  typeLine: String,
  oracleText: String,
  colors: [String],
  rarity: String,
  imageUris: Schema.Types.Mixed,
  prices: Schema.Types.Mixed,
  tcgplayerId: { type: Number, index: true },
  scryfall: Schema.Types.Mixed,
  edhrec: edhrecSchema,
  tcg: Schema.Types.Mixed,
  priceHistory: [priceSnapshotSchema],
  investmentScore: { type: Number, index: true },
  investmentSignals: [String],
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'cards'
});

cardSchema.index({ name: 'text', setName: 'text', typeLine: 'text', oracleText: 'text' });
cardSchema.index({ setCode: 1, collectorNumber: 1 });
cardSchema.index({ investmentScore: -1 });

export const CardModel = mongoose.model<ICard>('Card', cardSchema);
