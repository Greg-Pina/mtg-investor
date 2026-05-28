import mongoose, { Document, Schema } from 'mongoose';

export type AlertStatus = 'pending' | 'triggered' | 'dismissed';

export interface IAlert extends Document {
  sessionId: string;
  cardId: mongoose.Types.ObjectId;
  targetPrice: number;
  direction: 'below' | 'above';
  status: AlertStatus;
  triggeredAt?: Date;
  email?: string;
  createdAt: Date;
}

const alertSchema = new Schema<IAlert>({
  sessionId: { type: String, required: true, index: true },
  cardId: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
  targetPrice: { type: Number, required: true },
  direction: { type: String, enum: ['below', 'above'], default: 'below' },
  status: { type: String, enum: ['pending', 'triggered', 'dismissed'], default: 'pending' },
  triggeredAt: Date,
  email: String
}, {
  timestamps: true,
  collection: 'alerts'
});

export const AlertModel = mongoose.model<IAlert>('Alert', alertSchema);
