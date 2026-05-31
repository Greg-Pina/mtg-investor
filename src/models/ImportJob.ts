import mongoose, { Document, Schema } from 'mongoose';

export interface IImportError {
  row: number;
  message: string;
  raw: string;
}

export type ImportStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface IImportJob extends Document {
  source: string;
  filename: string;
  fileSizeBytes: number;
  status: ImportStatus;
  rowsTotal: number;
  inserted: number;
  updated: number;
  skipped: number;
  importErrors: IImportError[];
  durationMs?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ImportJobSchema = new Schema<IImportJob>({
  source: { type: String, required: true },
  filename: { type: String, required: true },
  fileSizeBytes: { type: Number, default: 0 },
  status: { type: String, default: 'pending', index: true },
  rowsTotal: { type: Number, default: 0 },
  inserted: { type: Number, default: 0 },
  updated: { type: Number, default: 0 },
  skipped: { type: Number, default: 0 },
  importErrors: [{
    row: Number,
    message: String,
    raw: String,
    _id: false,
  }],
  durationMs: Number,
  completedAt: Date,
}, { timestamps: true });

export const ImportJob = mongoose.model<IImportJob>('ImportJob', ImportJobSchema);
