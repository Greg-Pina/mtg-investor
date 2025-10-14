import mongoose, { Document, Schema } from 'mongoose';

export interface IScryfallCard extends Document {
  scryfallId: string;
  name: string;
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  layout?: string;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  oracleText?: string;
  colors?: string[];
  colorIdentity?: string[];
  legalities?: Record<string, string>;
  imageUris?: Record<string, string>;
  prices?: Record<string, string | null>;
  tcgplayerId?: number;
  rarity?: string;
  usd?: string | null;
  usdFoil?: string | null;
  eur?: string | null;
  tix?: string | null;
  raw?: any;
  lastUpdated: Date;
}

const scryfallCardSchema = new Schema<IScryfallCard>({
  scryfallId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  setCode: { type: String },
  setName: { type: String },
  collectorNumber: { type: String },
  layout: { type: String },
  manaCost: { type: String },
  cmc: { type: Number },
  typeLine: { type: String },
  oracleText: { type: String },
  colors: [{ type: String }],
  colorIdentity: [{ type: String }],
  legalities: { type: Schema.Types.Mixed },
  imageUris: { type: Schema.Types.Mixed },
  prices: { type: Schema.Types.Mixed },
  tcgplayerId: { type: Number },
  rarity: { type: String },
  usd: { type: String },
  usdFoil: { type: String },
  eur: { type: String },
  tix: { type: String },
  raw: { type: Schema.Types.Mixed },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'scryfall_cards'
});

scryfallCardSchema.index({ name: 'text', setName: 'text', typeLine: 'text', oracleText: 'text' });
scryfallCardSchema.index({ setCode: 1, collectorNumber: 1 });

export const ScryfallCardModel = mongoose.model<IScryfallCard>('ScryfallCard', scryfallCardSchema);
