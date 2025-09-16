import mongoose, { Document, Schema } from 'mongoose';

// Interface for the processed data document
export interface IProcessedData extends Document {
  originalData: Record<string, any>;
  processedData: Record<string, any>;
  pythonOutput?: any;
  processedAt: Date;
  status: 'success' | 'error' | 'processing';
  errorMessage?: string;
  metadata?: {
    source?: string;
    processingTime?: number;
    pythonScript?: string;
  };
}

// Schema definition
const processedDataSchema = new Schema<IProcessedData>({
  originalData: {
    type: Schema.Types.Mixed,
    required: true
  },
  processedData: {
    type: Schema.Types.Mixed,
    required: true
  },
  pythonOutput: {
    type: Schema.Types.Mixed,
    default: null
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['success', 'error', 'processing'],
    default: 'processing'
  },
  errorMessage: {
    type: String,
    default: null
  },
  metadata: {
    source: { type: String },
    processingTime: { type: Number },
    pythonScript: { type: String }
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
processedDataSchema.index({ processedAt: -1 });
processedDataSchema.index({ status: 1 });

export const ProcessedDataModel = mongoose.model<IProcessedData>('ProcessedData', processedDataSchema);