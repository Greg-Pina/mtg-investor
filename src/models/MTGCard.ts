import mongoose, { Document, Schema } from 'mongoose';

// Interface for MTG card data
export interface IMTGCard extends Document {
  cardName: string;
  edhrecData: {
    details?: any;
    edhrecLink?: string;
    combos?: any[];
    commanderData?: any;
    commanderCards?: any[];
    averageDeck?: any;
    knownDecks?: any[];
    recommendations?: {
      newCards?: any[];
      highSynergyCards?: any[];
      topCards?: any[];
      topCreatures?: any[];
      topInstants?: any[];
      topSorceries?: any[];
      topEnchantments?: any[];
      topArtifacts?: any[];
      topManaArtifacts?: any[];
      topBattles?: any[];
      topPlaneswalkers?: any[];
      topUtilityLands?: any[];
      topLands?: any[];
    };
  };
  analysis?: {
    investmentMetrics?: any;
    popularityMetrics?: any;
    synergyAnalysis?: any;
  };
  lastUpdated: Date;
  dataSource: string;
  processingInfo?: {
    processorVersion?: string;
    pyedhrecAvailable?: boolean;
    processingMode?: string;
  };
}

// Schema definition for MTG cards
const mtgCardSchema = new Schema<IMTGCard>({
  cardName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  edhrecData: {
    details: { type: Schema.Types.Mixed },
    edhrecLink: { type: String },
    combos: [{ type: Schema.Types.Mixed }],
    commanderData: { type: Schema.Types.Mixed },
    commanderCards: [{ type: Schema.Types.Mixed }],
    averageDeck: { type: Schema.Types.Mixed },
    knownDecks: [{ type: Schema.Types.Mixed }],
    recommendations: {
      newCards: [{ type: Schema.Types.Mixed }],
      highSynergyCards: [{ type: Schema.Types.Mixed }],
      topCards: [{ type: Schema.Types.Mixed }],
      topCreatures: [{ type: Schema.Types.Mixed }],
      topInstants: [{ type: Schema.Types.Mixed }],
      topSorceries: [{ type: Schema.Types.Mixed }],
      topEnchantments: [{ type: Schema.Types.Mixed }],
      topArtifacts: [{ type: Schema.Types.Mixed }],
      topManaArtifacts: [{ type: Schema.Types.Mixed }],
      topBattles: [{ type: Schema.Types.Mixed }],
      topPlaneswalkers: [{ type: Schema.Types.Mixed }],
      topUtilityLands: [{ type: Schema.Types.Mixed }],
      topLands: [{ type: Schema.Types.Mixed }]
    }
  },
  analysis: {
    investmentMetrics: { type: Schema.Types.Mixed },
    popularityMetrics: { type: Schema.Types.Mixed },
    synergyAnalysis: { type: Schema.Types.Mixed }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  dataSource: {
    type: String,
    default: 'edhrec.com'
  },
  processingInfo: {
    processorVersion: { type: String },
    pyedhrecAvailable: { type: Boolean },
    processingMode: { type: String }
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
mtgCardSchema.index({ cardName: 'text' });
mtgCardSchema.index({ lastUpdated: -1 });
mtgCardSchema.index({ 'analysis.investmentMetrics.isCommander': 1 });
mtgCardSchema.index({ 'analysis.investmentMetrics.hasCombos': 1 });

export const MTGCardModel = mongoose.model<IMTGCard>('MTGCard', mtgCardSchema);