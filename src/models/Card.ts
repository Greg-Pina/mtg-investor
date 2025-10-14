import mongoose, { Document, Schema } from 'mongoose';

// Canonical card document keyed by Scryfall id; other providers augment via nested fields
export interface ICard extends Document {
  scryfallId: string;          // Primary key
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

  // Foreign keys/links
  tcgplayerId?: number;

  // Provider data
  scryfall?: any;              // raw Scryfall
  edhrec?: any;                // advanced_processor output excerpt
  tcg?: {
    currentPrice?: {
      usd?: number; usdFoil?: number; market?: number; low?: number; mid?: number; high?: number;
    };
    history?: Array<{ date: Date; marketPrice?: number; lowPrice?: number; highPrice?: number }>;
    productIds?: number[];
  };

  lastUpdated: Date;
}

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
  tcgplayerId: Number,
  scryfall: Schema.Types.Mixed,
  edhrec: Schema.Types.Mixed,
  tcg: Schema.Types.Mixed,
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'cards'
});

cardSchema.index({ name: 'text', setName: 'text', typeLine: 'text', oracleText: 'text' });
cardSchema.index({ setCode: 1, collectorNumber: 1 });

export const CardModel = mongoose.model<ICard>('Card', cardSchema);
