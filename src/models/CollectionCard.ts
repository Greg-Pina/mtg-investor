import mongoose, { Document, Schema } from 'mongoose';

export type EchoCondition =
  | 'NM' | 'LP' | 'MP' | 'HP' | 'D' | 'ALT' | 'ART' | 'PRE' | 'TS' | 'SGN'
  | 'BGS' | 'B10' | 'B95' | 'B9' | 'B85' | 'B8' | 'B75' | 'B7'
  | 'PSA' | 'P10' | 'P95' | 'P9' | 'P85' | 'P8' | 'P75' | 'P7'
  | 'CGC' | 'C10P' | 'C10' | 'C95' | 'C9' | 'C85' | 'C8' | 'C75' | 'C7'
  | 'PCG' | 'PC10' | 'PC95' | 'PC9' | 'PC85' | 'PC8' | 'PC75' | 'PC7';

export type EchoLanguage = 'EN' | 'DE' | 'FR' | 'RU' | 'IT' | 'ES' | 'PT' | 'CT' | 'CS' | 'JP' | 'KR';

export type CollectionStatus = 'In Collection' | 'Listed for Sale' | 'Sold';

export interface IEchoPrices {
  tcgLow?: number;
  tcgMid?: number;
  tcgMarket?: number;
  tcgHigh?: number;
  foilPrice?: number;
  lastUpdated?: Date;
}

export interface ICollectionCard extends Document {
  echoInventoryId?: number;
  emid?: number;
  scryfallId?: string;
  tcgplayerId?: number;
  name: string;
  setCode: string;
  expansion?: string;
  collectorNumber?: string;
  isFoil: boolean;
  condition: EchoCondition;
  quantity: number;
  language: EchoLanguage;
  status: CollectionStatus;
  acquisitionPrice?: number;
  acquisitionDate?: Date;
  source: string;
  echoPrices?: IEchoPrices;
  notes?: string;
  imageUrl?: string;
  importJobId?: mongoose.Types.ObjectId;
  lastSyncedAt?: Date;
}

const EchoPricesSchema = new Schema<IEchoPrices>({
  tcgLow: Number,
  tcgMid: Number,
  tcgMarket: Number,
  tcgHigh: Number,
  foilPrice: Number,
  lastUpdated: Date,
}, { _id: false });

const CollectionCardSchema = new Schema<ICollectionCard>({
  echoInventoryId: { type: Number, index: true, sparse: true },
  emid: { type: Number, index: true, sparse: true },
  scryfallId: { type: String, index: true, sparse: true },
  tcgplayerId: { type: Number, sparse: true },
  name: { type: String, required: true, index: true },
  setCode: { type: String, required: true },
  expansion: String,
  collectorNumber: String,
  isFoil: { type: Boolean, default: false },
  condition: { type: String, default: 'NM' },
  quantity: { type: Number, default: 1, min: 0 },
  language: { type: String, default: 'EN' },
  status: { type: String, default: 'In Collection', index: true },
  acquisitionPrice: Number,
  acquisitionDate: Date,
  source: { type: String, required: true, default: 'manual' },
  echoPrices: EchoPricesSchema,
  notes: String,
  imageUrl: String,
  importJobId: { type: Schema.Types.ObjectId, ref: 'ImportJob', sparse: true },
  lastSyncedAt: Date,
}, { timestamps: true });

// Dedup indexes — prefer emid-based, fall back to scryfallId, then name
CollectionCardSchema.index({ emid: 1, isFoil: 1, condition: 1, language: 1 }, { unique: true, sparse: true });
CollectionCardSchema.index({ scryfallId: 1, isFoil: 1, condition: 1, language: 1 }, { unique: true, sparse: true });
CollectionCardSchema.index({ name: 1, setCode: 1, isFoil: 1, condition: 1 });

export const CollectionCard = mongoose.model<ICollectionCard>('CollectionCard', CollectionCardSchema);
