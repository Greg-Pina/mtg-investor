import axios from 'axios';
import csv from 'csv-parser';
import { Readable } from 'stream';
import {
  TCGCategoryModel,
  TCGGroupModel,
  TCGProductModel,
  TCGPriceModel,
  ITCGCategory,
  ITCGGroup,
  ITCGProduct,
  ITCGPrice,
  CardModel
} from '../models';
import { MTG_SETS, MTGSetsHelper, MTGSet } from '../data/mtgSets';

export interface TCGCSVConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface CategoryData {
  categoryId: number;
  categoryName: string;
}

export interface GroupData {
  groupId: number;
  groupName: string;
  categoryId: number;
}

export interface ProductData {
  productId: number;
  productName: string;
  groupId: number;
  categoryId: number;
  extendedData?: Record<string, any>;
}

export interface PriceData {
  productId: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  marketPrice?: number;
  directLowPrice?: number;
  subTypeName?: string;
}

export class TCGCSVService {
  private static instance: TCGCSVService;
  private config: TCGCSVConfig;

  private constructor() {
    this.config = {
      baseUrl: 'https://tcgcsv.com/tcgplayer',
      timeout: 30000,
      retryAttempts: 3
    };
    console.log('TCGCSVService initialized for direct CSV access from ProductsAndPrices.csv files');
  }

  public static getInstance(): TCGCSVService {
    if (!TCGCSVService.instance) {
      TCGCSVService.instance = new TCGCSVService();
    }
    return TCGCSVService.instance;
  }

  /**
   * Fetch and parse CSV data from TCGCSV
   */
  private async fetchCSV<T>(url: string): Promise<T[]> {
    try {
      console.log(`Fetching CSV data from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: this.config.timeout,
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        const results: T[] = [];
        
        Readable.from(response.data)
          .pipe(csv())
          .on('data', (data: any) => {
            results.push(data);
          })
          .on('end', () => {
            console.log(`Successfully parsed ${results.length} records from ${url}`);
            resolve(results);
          })
          .on('error', (error: any) => {
            console.error(`Error parsing CSV from ${url}:`, error);
            reject(error);
          });
      });

    } catch (error) {
      console.error(`Error fetching CSV from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetch products and prices for a specific Magic set using direct CSV access
   * Uses the format: https://tcgcsv.com/tcgplayer/1/{groupId}/ProductsAndPrices.csv
   */
  public async fetchSetData(groupId: number): Promise<{ products: ProductData[], prices: PriceData[] }> {
    try {
      const url = `${this.config.baseUrl}/1/${groupId}/ProductsAndPrices.csv`;
      const rawData = await this.fetchCSV<any>(url);
      
      const products: ProductData[] = [];
      const prices: PriceData[] = [];

      rawData.forEach(row => {
        const productId = parseInt(row.ProductId || row.productId || row.product_id || row.id);
        const productName = row.ProductName || row.productName || row.product_name || row.name;

        if (productId && productName) {
          // Extract product data
          const product: ProductData = {
            productId,
            productName,
            groupId,
            categoryId: 1, // Magic: The Gathering
            extendedData: {
              cardText: row.CardText || row.cardText,
              rarity: row.Rarity || row.rarity,
              setNumber: row.SetNumber || row.setNumber,
              manaCost: row.ManaCost || row.manaCost,
              cardType: row.CardType || row.cardType,
              subType: row.SubType || row.subType,
              power: row.Power || row.power,
              toughness: row.Toughness || row.toughness,
              loyalty: row.Loyalty || row.loyalty,
              artist: row.Artist || row.artist,
              flavorText: row.FlavorText || row.flavorText,
              collectorNumber: row.CollectorNumber || row.collectorNumber,
              url: row.URL || row.url
            }
          };
          products.push(product);

          // Extract price data - TCGCSV uses different pricing columns
          const normalLow = this.parsePrice(row.TCGPlayerLow || row.tcgPlayerLow);
          const normalMid = this.parsePrice(row.TCGPlayerMid || row.tcgPlayerMid);
          const normalHigh = this.parsePrice(row.TCGPlayerHigh || row.tcgPlayerHigh);
          const normalMarket = this.parsePrice(row.TCGPlayerMarket || row.tcgPlayerMarket);
          
          const foilLow = this.parsePrice(row.TCGPlayerFoilLow || row.tcgPlayerFoilLow);
          const foilMid = this.parsePrice(row.TCGPlayerFoilMid || row.tcgPlayerFoilMid);
          const foilHigh = this.parsePrice(row.TCGPlayerFoilHigh || row.tcgPlayerFoilHigh);
          const foilMarket = this.parsePrice(row.TCGPlayerFoilMarket || row.tcgPlayerFoilMarket);

          // Create normal price entry
          if (normalLow || normalMid || normalHigh || normalMarket) {
            const normalPrice: PriceData = {
              productId,
              lowPrice: normalLow,
              midPrice: normalMid,
              highPrice: normalHigh,
              marketPrice: normalMarket,
              subTypeName: 'Normal'
            };
            prices.push(normalPrice);
          }

          // Create foil price entry if foil prices exist
          if (foilLow || foilMid || foilHigh || foilMarket) {
            const foilPrice: PriceData = {
              productId: productId + 1000000, // Offset for foil versions
              lowPrice: foilLow,
              midPrice: foilMid,
              highPrice: foilHigh,
              marketPrice: foilMarket,
              subTypeName: 'Foil'
            };
            prices.push(foilPrice);
          }
        }
      });

      console.log(`Processed ${products.length} products and ${prices.length} price entries for group ${groupId}`);
      return { products, prices };

    } catch (error) {
      console.error(`Error fetching data for group ${groupId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize Magic data for specific sets
   */
  public async initializeMagicSets(setNames: string[] = []): Promise<void> {
    try {
      console.log('Starting Magic sets initialization...');
      
      // Initialize the Magic category
      const magicCategory = {
        categoryId: 1,
        displayName: 'Magic: The Gathering'
      };
      
      await TCGCategoryModel.findOneAndUpdate(
        { categoryId: 1 },
        magicCategory,
        { upsert: true, new: true }
      );
      console.log('Magic category initialized');

      // If no specific sets provided, use popular sets for testing
      const setsToProcess = setNames.length > 0 
        ? setNames.map(name => MTGSetsHelper.getSetByName(name)).filter(set => set !== undefined) as MTGSet[]
        : MTGSetsHelper.getPopularSets().slice(0, 3); // Limit to 3 for initial testing

      console.log(`Processing ${setsToProcess.length} sets:`, setsToProcess.map(s => s.name));

      for (const set of setsToProcess) {
        try {
          console.log(`Processing set: ${set.name} (Group ID: ${set.groupId})`);
          
          // Save group information
          await TCGGroupModel.findOneAndUpdate(
            { groupId: set.groupId },
            { 
              groupId: set.groupId, 
              name: set.name, 
              categoryId: 1 
            },
            { upsert: true, new: true }
          );

          // Fetch and save products and prices
          const { products, prices } = await this.fetchSetData(set.groupId);
          
          // Save products
          for (const product of products) {
            await TCGProductModel.findOneAndUpdate(
              { productId: product.productId },
              { 
                productId: product.productId, 
                productName: product.productName,
                groupId: product.groupId,
                categoryId: product.categoryId,
                extendedData: product.extendedData
              },
              { upsert: true, new: true }
            );
          }

          // Save prices — upsert by (productId, date) to preserve history
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          for (const price of prices) {
            const priceDoc = { ...price, priceDate: today };
            await TCGPriceModel.findOneAndUpdate(
              { productId: price.productId, priceDate: today },
              priceDoc,
              { upsert: true, new: true }
            );
            // Append snapshot to the canonical Card model's priceHistory
            if (price.marketPrice != null) {
              await CardModel.updateOne(
                { tcgplayerId: price.productId },
                {
                  $push: {
                    priceHistory: {
                      date: today,
                      market: price.marketPrice,
                      source: 'tcgplayer'
                    }
                  }
                }
              );
            }
          }

          console.log(`Completed ${set.name}: ${products.length} products, ${prices.length} prices`);
          
        } catch (setError) {
          console.error(`Error processing set ${set.name}:`, setError);
          // Continue with other sets even if one fails
        }
      }

      console.log('Magic sets initialization completed');

    } catch (error) {
      console.error('Error during Magic sets initialization:', error);
      throw error;
    }
  }

  /**
   * Initialize sample data (fallback method)
   */
  public async initializeMagicData(): Promise<void> {
    try {
      console.log('Initializing with sample data...');
      
      // Use sample data if direct CSV access fails
      const sampleCategories = [{ categoryId: 1, displayName: 'Magic: The Gathering' }];
      const sampleGroups = [
        { groupId: 1001, name: 'Core Set 2021', categoryId: 1 },
        { groupId: 1002, name: 'Throne of Eldraine', categoryId: 1 },
        { groupId: 1003, name: 'Modern Horizons 2', categoryId: 1 }
      ];
      const sampleProducts = [
        { productId: 200001, productName: 'Lightning Bolt', groupId: 1001, categoryId: 1 },
        { productId: 200002, productName: 'Black Lotus', groupId: 1001, categoryId: 1 },
        { productId: 200003, productName: 'Oko, Thief of Crowns', groupId: 1002, categoryId: 1 },
        { productId: 200004, productName: 'Lightning Bolt (Foil)', groupId: 1001, categoryId: 1 },
        { productId: 200005, productName: 'Ragavan, Nimble Pilferer', groupId: 1003, categoryId: 1 }
      ];
      const samplePrices = [
        { productId: 200001, lowPrice: 0.50, midPrice: 1.25, highPrice: 2.00, marketPrice: 1.15, subTypeName: 'Normal' },
        { productId: 200002, lowPrice: 15000.00, midPrice: 25000.00, highPrice: 35000.00, marketPrice: 24500.00, subTypeName: 'Normal' },
        { productId: 200003, lowPrice: 8.00, midPrice: 12.50, highPrice: 18.00, marketPrice: 11.75, subTypeName: 'Normal' },
        { productId: 200004, lowPrice: 2.50, midPrice: 4.25, highPrice: 6.00, marketPrice: 3.95, subTypeName: 'Foil' },
        { productId: 200005, lowPrice: 45.00, midPrice: 65.00, highPrice: 85.00, marketPrice: 62.50, subTypeName: 'Normal' }
      ];

      // Save all sample data
      for (const category of sampleCategories) {
        await TCGCategoryModel.findOneAndUpdate({ categoryId: category.categoryId }, category, { upsert: true });
      }
      for (const group of sampleGroups) {
        await TCGGroupModel.findOneAndUpdate({ groupId: group.groupId }, group, { upsert: true });
      }
      for (const product of sampleProducts) {
        await TCGProductModel.findOneAndUpdate({ productId: product.productId }, product, { upsert: true });
      }
      for (const price of samplePrices) {
        await TCGPriceModel.create({ ...price, priceDate: new Date() });
      }

      console.log('Sample data initialization completed');
      
    } catch (error) {
      console.error('Error during sample data initialization:', error);
      throw error;
    }
  }

  /**
   * Search for Magic products by name
   */
  public async searchMagicProducts(searchTerm: string, limit: number = 20): Promise<ITCGProduct[]> {
    try {
      return await TCGProductModel.find({
        categoryId: 1,
        productName: { $regex: searchTerm, $options: 'i' }
      })
      .limit(limit)
      .exec();
      
    } catch (error) {
      console.error('Error searching Magic products:', error);
      throw error;
    }
  }

  /**
   * Get current price for a product
   */
  public async getProductPrice(productId: number): Promise<ITCGPrice | null> {
    try {
      return await TCGPriceModel.findOne({ productId })
        .sort({ priceDate: -1 })
        .exec();
        
    } catch (error) {
      console.error('Error getting product price:', error);
      throw error;
    }
  }

  /**
   * Get prices for a product by name
   */
  public async getProductPricesByName(productName: string): Promise<ITCGPrice[]> {
    try {
      // Find products matching the name
      const products = await TCGProductModel.find({
        categoryId: 1,
        productName: { $regex: productName, $options: 'i' }
      });

      if (products.length === 0) {
        return [];
      }

      // Get prices for all matching products
      const productIds = products.map(p => p.productId);
      return await TCGPriceModel.find({ 
        productId: { $in: productIds } 
      })
      .sort({ priceDate: -1 })
      .exec();
      
    } catch (error) {
      console.error('Error getting product prices by name:', error);
      throw error;
    }
  }

  /**
   * Get available Magic sets information
   */
  public getAvailableSets(): MTGSet[] {
    return MTGSetsHelper.getAllSets();
  }

  /**
   * Get sets by category
   */
  public getSetsByCategory(category: 'classic' | 'modern' | 'masters' | 'commander' | 'universes-beyond' | 'un-sets'): MTGSet[] {
    return MTGSetsHelper.getSetsByCategory(category);
  }

  /**
   * Parse price string to number
   */
  private parsePrice(priceStr: string | number | undefined): number | undefined {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr || priceStr === '') return undefined;
    
    const cleaned = String(priceStr).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? undefined : parsed;
  }
}