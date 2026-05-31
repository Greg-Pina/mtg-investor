import { Request, Response } from 'express';
import { MTGCardModel, IMTGCard, TCGProductModel, TCGPriceModel } from '../models';
import { PythonService, PythonExecutionResult, TCGCSVService } from '../services';
import { ValidatedRequest } from '../middleware';

export interface MTGCardRequest {
  cardName?: string;
  cardNames?: string[];
  cards?: string[];
  forceUpdate?: boolean;
  options?: {
    timeout?: number;
    includeAnalysis?: boolean;
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class MTGController {
  private pythonService: PythonService;
  private tcgService: TCGCSVService;

  constructor() {
    this.pythonService = PythonService.getInstance();
    this.tcgService = TCGCSVService.getInstance();
  }

  /**
   * Check if database is available
   */
  private isDatabaseAvailable(): boolean {
    return !!process.env.MONGODB_URI && process.env.NODE_ENV !== 'development-no-db';
  }

  /**
   * Process MTG card data using the advanced processor
   */
  public async processCardData(req: ValidatedRequest<MTGCardRequest>, res: Response): Promise<void> {
    try {
      const { cardName, cardNames, cards, forceUpdate, options } = req.validatedData!;
      const startTime = Date.now();

      // Determine which cards to process
      const cardsToProcess: string[] = [];
      if (cardName) cardsToProcess.push(cardName);
      if (cardNames) cardsToProcess.push(...cardNames);
      if (cards) cardsToProcess.push(...cards);

      if (cardsToProcess.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No card names provided',
          expectedFormat: {
            cardName: 'Single card name',
            cardNames: ['Array', 'of', 'card', 'names'],
            cards: ['Alternative', 'array', 'format']
          }
        });
        return;
      }

      // Check if cards already exist in database (unless force update)
      const existingCards: IMTGCard[] = [];
      if (!forceUpdate && this.isDatabaseAvailable()) {
        const existing = await MTGCardModel.find({
          cardName: { $in: cardsToProcess }
        });
        existingCards.push(...existing);
      }

      // Determine which cards need to be fetched
      const existingCardNames = existingCards.map(card => card.cardName);
      const cardsToFetch = cardsToProcess.filter(name => !existingCardNames.includes(name) || forceUpdate);

      let pythonResult: PythonExecutionResult | null = null;
      const processedCards: IMTGCard[] = [...existingCards];

      // Fetch new card data if needed
      if (cardsToFetch.length > 0) {
        const pythonInput = cardsToFetch.length === 1 
          ? { card_name: cardsToFetch[0] }
          : { card_names: cardsToFetch };

        pythonResult = await this.pythonService.executeScript(pythonInput, {
          scriptName: 'advanced_processor.py',
          timeout: options?.timeout || 60000 // 60 seconds for MTG data
        });

        if (pythonResult.success && pythonResult.output) {
          if (this.isDatabaseAvailable()) {
            await this.saveCardData(pythonResult.output, cardsToFetch);
            
            // Fetch the newly saved cards
            const newCards = await MTGCardModel.find({
              cardName: { $in: cardsToFetch }
            });
            processedCards.push(...newCards);
          } 
          
          // Always include raw Python output for immediate access
          if (!processedCards.length && pythonResult.output) {
            // If we couldn't fetch from database, include raw output
            processedCards.push(pythonResult.output);
          }
        }
      }

      const processingTime = Date.now() - startTime;

      res.status(200).json({
        success: true,
        cardsProcessed: cardsToProcess.length,
        cardsFromDatabase: existingCards.length,
        cardsFromEDHRec: cardsToFetch.length,
        cards: processedCards,
        pythonExecutionSuccess: pythonResult?.success ?? true,
        pythonError: pythonResult?.error,
        processingTime
      });

    } catch (error) {
      console.error('Error processing MTG card data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Save card data to database
   */
  private async saveCardData(pythonOutput: any, cardNames: string[]): Promise<void> {
    if (!this.isDatabaseAvailable()) {
      console.log('Database not available, skipping save operation');
      return;
    }

    try {
      if (cardNames.length === 1) {
        // Single card processing
        await this.saveSingleCard(pythonOutput);
      } else {
        // Multiple cards processing
        if (pythonOutput.cards) {
          for (const [cardName, cardData] of Object.entries(pythonOutput.cards)) {
            await this.saveSingleCard(cardData, cardName);
          }
        }
      }
    } catch (error) {
      console.error('Error saving card data:', error);
      throw error;
    }
  }

  /**
   * Save a single card's data
   */
  private async saveSingleCard(cardData: any, cardNameOverride?: string): Promise<void> {
    const cardName = cardNameOverride || cardData.card_name;
    if (!cardName) return;

    const cardDoc = {
      cardName,
      edhrecData: {
        details: cardData.details,
        edhrecLink: cardData.edhrec_link,
        combos: cardData.combos,
        commanderData: cardData.commander_data,
        commanderCards: cardData.commander_cards,
        averageDeck: cardData.average_deck,
        knownDecks: cardData.known_decks,
        recommendations: cardData.recommendations
      },
      analysis: cardData.analysis,
      lastUpdated: new Date(),
      dataSource: cardData.data_source || 'edhrec.com',
      processingInfo: cardData.processing_info
    };

    await MTGCardModel.findOneAndUpdate(
      { cardName },
      cardDoc,
      { upsert: true, new: true }
    );
  }

  /**
   * Get card data by name
   */
  public async getCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;
      
      const card = await MTGCardModel.findOne({ 
        cardName: new RegExp(`^${escapeRegex(cardName)}$`, 'i') 
      });

      if (!card) {
        res.status(404).json({
          success: false,
          error: 'Card not found',
          suggestion: 'Try processing the card first using POST /api/mtg/process'
        });
        return;
      }

      res.status(200).json({
        success: true,
        card
      });

    } catch (error) {
      console.error('Error retrieving card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search for cards
   */
  public async searchCards(req: Request, res: Response): Promise<void> {
    try {
      const { 
        q: query, 
        page = '1', 
        limit = '10',
        isCommander,
        hasCombos
      } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      const searchQuery: any = {};

      // Text search
      if (query) {
        searchQuery.$text = { $search: query as string };
      }

      // Filter by commander status
      if (isCommander === 'true') {
        searchQuery['analysis.investmentMetrics.isCommander'] = true;
      }

      // Filter by combo status
      if (hasCombos === 'true') {
        searchQuery['analysis.investmentMetrics.hasCombos'] = true;
      }

      const [cards, total] = await Promise.all([
        MTGCardModel.find(searchQuery)
          .sort(query ? { score: { $meta: 'textScore' } } : { lastUpdated: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        MTGCardModel.countDocuments(searchQuery)
      ]);

      res.status(200).json({
        success: true,
        cards,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      });

    } catch (error) {
      console.error('Error searching cards:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get cards with investment potential
   */
  public async getInvestmentCards(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '20' } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      const cards = await MTGCardModel.find({
        $or: [
          { 'analysis.investmentMetrics.isCommander': true },
          { 'analysis.investmentMetrics.hasCombos': true },
          { 'analysis.synergyAnalysis.totalRecommendations': { $gte: 50 } }
        ]
      })
      .sort({ 'analysis.popularityMetrics.totalDecks': -1 })
      .limit(limitNum)
      .lean();

      res.status(200).json({
        success: true,
        cards,
        criteria: [
          'Is a commander',
          'Has combo potential',
          'Has 50+ synergy recommendations'
        ]
      });

    } catch (error) {
      console.error('Error retrieving investment cards:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete card data
   */
  public async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;

      const result = await MTGCardModel.findOneAndDelete({
        cardName: new RegExp(`^${escapeRegex(cardName)}$`, 'i')
      });

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Card not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Card "${cardName}" deleted successfully`
      });

    } catch (error) {
      console.error('Error deleting card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get pricing data for a card from TCGPlayer
   */
  public async getCardPricing(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;
      
      // Search for the card in TCGPlayer products
      const products = await this.tcgService.searchMagicProducts(cardName, 10);
      
      if (products.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Card not found in TCGPlayer database',
          suggestion: 'Try a different card name or check spelling'
        });
        return;
      }

      // Get pricing for each matching product
      const productPricing = await Promise.all(
        products.map(async (product) => {
          const pricing = await this.tcgService.getProductPrice(product.productId);
          return {
            product: {
              productId: product.productId,
              productName: product.productName,
              groupId: product.groupId,
              extendedData: product.extendedData
            },
            pricing
          };
        })
      );

      res.status(200).json({
        success: true,
        cardName,
        matchingProducts: productPricing.length,
        products: productPricing
      });

    } catch (error) {
      console.error('Error getting card pricing:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Initialize TCGPlayer data
   */
  public async initializeTCGData(req: Request, res: Response): Promise<void> {
    try {
      await this.tcgService.initializeMagicData();
      
      res.status(200).json({
        success: true,
        message: 'TCGPlayer Magic data initialization completed'
      });

    } catch (error) {
      console.error('Error initializing TCG data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize TCGPlayer data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search TCGPlayer products
   */
  public async searchTCGProducts(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit = 20 } = req.query;
      
      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required'
        });
        return;
      }

      const products = await this.tcgService.searchMagicProducts(q, parseInt(limit as string));
      
      res.status(200).json({
        success: true,
        query: q,
        results: products.length,
        products
      });

    } catch (error) {
      console.error('Error searching TCG products:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get enhanced card data with EDHREC and TCGPlayer pricing
   */
  public async getEnhancedCardData(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;
      
      // Get EDHREC data
      let edhrecData = null;
      if (this.isDatabaseAvailable()) {
        edhrecData = await MTGCardModel.findOne({
          cardName: new RegExp(`^${escapeRegex(cardName)}$`, 'i')
        });
      }

      // Get TCGPlayer pricing data
      const tcgProducts = await this.tcgService.searchMagicProducts(cardName, 5);
      const pricingData = await Promise.all(
        tcgProducts.map(async (product) => {
          const pricing = await this.tcgService.getProductPrice(product.productId);
          return { product, pricing };
        })
      );

      res.status(200).json({
        success: true,
        cardName,
        edhrecData,
        tcgPlayerData: {
          matchingProducts: pricingData.length,
          products: pricingData
        },
        lastUpdated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error getting enhanced card data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Initialize specific Magic sets from TCGCSV
   */
  public async initializeSets(req: Request, res: Response): Promise<void> {
    try {
      const { sets = [] } = req.body;
      
      if (!Array.isArray(sets)) {
        res.status(400).json({
          success: false,
          error: 'Sets must be an array of set names'
        });
        return;
      }

      console.log(`Initializing sets: ${sets.length > 0 ? sets.join(', ') : 'popular sets'}`);
      
      await this.tcgService.initializeMagicSets(sets);

      res.status(200).json({
        success: true,
        message: `Successfully initialized ${sets.length > 0 ? sets.length + ' specific sets' : 'popular sets'}`,
        sets: sets.length > 0 ? sets : ['Popular sets for testing'],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error initializing sets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize sets',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get available Magic sets information
   */
  public async getAvailableSets(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      
      let sets;
      if (category && typeof category === 'string') {
        const validCategories = ['classic', 'modern', 'masters', 'commander', 'universes-beyond', 'un-sets'];
        if (validCategories.includes(category)) {
          sets = this.tcgService.getSetsByCategory(category as any);
        } else {
          res.status(400).json({
            success: false,
            error: `Invalid category. Valid categories: ${validCategories.join(', ')}`
          });
          return;
        }
      } else {
        sets = this.tcgService.getAvailableSets();
      }

      res.status(200).json({
        success: true,
        totalSets: sets.length,
        category: category || 'all',
        sets: sets.map(set => ({
          name: set.name,
          groupId: set.groupId,
          endpoint: set.endpoint
        }))
      });

    } catch (error) {
      console.error('Error getting available sets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available sets',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}