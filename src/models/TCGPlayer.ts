import mongoose, { Schema, Document } from 'mongoose';

// TCGPlayer Category interface and schema
export interface ITCGCategory extends Document {
  categoryId: number;
  categoryName: string;
  createdAt: Date;
  updatedAt: Date;
}

const tcgCategorySchema = new Schema<ITCGCategory>({
  categoryId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  categoryName: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'tcg_categories'
});

// TCGPlayer Group interface and schema
export interface ITCGGroup extends Document {
  groupId: number;
  groupName: string;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
}

const tcgGroupSchema = new Schema<ITCGGroup>({
  groupId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  groupName: {
    type: String,
    required: true,
    index: true
  },
  categoryId: {
    type: Number,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'tcg_groups'
});

// TCGPlayer Product interface and schema
export interface ITCGProduct extends Document {
  productId: number;
  productName: string;
  groupId: number;
  categoryId: number;
  extendedData?: {
    cardText?: string;
    rarity?: string;
    setNumber?: string;
    manaCost?: string;
    cardType?: string;
    subType?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    artist?: string;
    flavorText?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tcgProductSchema = new Schema<ITCGProduct>({
  productId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  productName: {
    type: String,
    required: true,
    index: true
  },
  groupId: {
    type: Number,
    required: true,
    index: true
  },
  categoryId: {
    type: Number,
    required: true,
    index: true
  },
  extendedData: {
    cardText: String,
    rarity: String,
    setNumber: String,
    manaCost: String,
    cardType: String,
    subType: String,
    power: String,
    toughness: String,
    loyalty: String,
    artist: String,
    flavorText: String
  }
}, {
  timestamps: true,
  collection: 'tcg_products'
});

// TCGPlayer Price interface and schema
export interface ITCGPrice extends Document {
  productId: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number;
  subTypeName?: string;
  priceDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tcgPriceSchema = new Schema<ITCGPrice>({
  productId: {
    type: Number,
    required: true,
    index: true
  },
  lowPrice: {
    type: Number,
    min: 0
  },
  midPrice: {
    type: Number,
    min: 0
  },
  highPrice: {
    type: Number,
    min: 0
  },
  marketPrice: {
    type: Number,
    min: 0,
    index: true
  },
  directLowPrice: {
    type: Number,
    min: 0
  },
  subTypeName: {
    type: String,
    index: true
  },
  priceDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'tcg_prices'
});

// Create compound indexes for efficient queries
tcgGroupSchema.index({ categoryId: 1, groupName: 1 });
tcgProductSchema.index({ categoryId: 1, groupId: 1 });
tcgProductSchema.index({ categoryId: 1, productName: 'text' });
tcgPriceSchema.index({ productId: 1, priceDate: -1 });

// Export models
export const TCGCategoryModel = mongoose.model<ITCGCategory>('TCGCategory', tcgCategorySchema);
export const TCGGroupModel = mongoose.model<ITCGGroup>('TCGGroup', tcgGroupSchema);
export const TCGProductModel = mongoose.model<ITCGProduct>('TCGProduct', tcgProductSchema);
export const TCGPriceModel = mongoose.model<ITCGPrice>('TCGPrice', tcgPriceSchema);

// Combined pricing data interface for API responses
export interface ITCGProductWithPricing extends ITCGProduct {
  currentPrice?: ITCGPrice;
  priceHistory?: ITCGPrice[];
  group?: ITCGGroup;
  category?: ITCGCategory;
}

// Helper types for API requests
export interface TCGPlayerSearchRequest {
  categoryId?: number;
  groupId?: number;
  productName?: string;
  rarity?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'name' | 'price' | 'rarity' | 'groupName';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TCGPlayerPriceRequest {
  productId: number;
  dateRange?: {
    startDate?: Date;
    endDate?: Date;
  };
}