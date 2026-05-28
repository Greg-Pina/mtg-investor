import mongoose, { Document, Schema } from 'mongoose';

export interface IWatchlistItem extends Document {
  sessionId: string;
  cardId: mongoose.Types.ObjectId;
  addedAt: Date;
  targetPrice?: number;
  notes?: string;
}

const watchlistSchema = new Schema<IWatchlistItem>({
  sessionId: { type: String, required: true, index: true },
  cardId: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
  addedAt: { type: Date, default: Date.now },
  targetPrice: Number,
  notes: String
}, {
  timestamps: true,
  collection: 'watchlist'
});

watchlistSchema.index({ sessionId: 1, cardId: 1 }, { unique: true });

export const WatchlistModel = mongoose.model<IWatchlistItem>('Watchlist', watchlistSchema);
