import { Request, Response } from 'express';
import { CardModel, ICard } from '../models';
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

  private isDatabaseAvailable(): boolean {
    return !!process.env.MONGODB_URI && process.env.NODE_ENV !== 'development-no-db';
  }

  public async processCardData(req: ValidatedRequest<MTGCardRequest>, res: Response): Promise<void> {
    try {
      const { cardName, cardNames, cards, forceUpdate, options } = req.validatedData!;
      const startTime = Date.now();

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

      const existingCards: ICard[] = [];
      if (!forceUpdate && this.isDatabaseAvailable()) {
        const existing = await CardModel.find({ name: { $in: cardsToProcess } });
        existingCards.push(...existing);
      }

      const existingCardNames = existingCards.map(card => card.name);
      const cardsToFetch = cardsToProcess.filter(name => !existingCardNames.includes(name) || forceUpdate);

      let pythonResult: PythonExecutionResult | null = null;
      const processedCards: ICard[] = [...existingCards];

      if (cardsToFetch.length > 0) {
        const pythonInput = cardsToFetch.length === 1
          ? { card_name: cardsToFetch[0] }
          : { card_names: cardsToFetch };

        pythonResult = await this.pythonService.executeScript(pythonInput, {
          scriptName: 'advanced_processor.py',
          timeout: options?.timeout || 60000
        });

        if (pythonResult.success && pythonResult.output) {
          if (this.isDatabaseAvailable()) {
            await this.saveCardData(pythonResult.output, cardsToFetch);

            const newCards = await CardModel.find({ name: { $in: cardsToFetch } });
            processedCards.push(...newCards);
          }

          if (!processedCards.length && pythonResult.output) {
            processedCards.push(pythonResult.output);
          }
        }
      }

      res.status(200).json({
        success: true,
        cardsProcessed: cardsToProcess.length,
        cardsFromDatabase: existingCards.length,
        cardsFromEDHRec: cardsToFetch.length,
        cards: processedCards,
        pythonExecutionSuccess: pythonResult?.success ?? true,
        pythonError: pythonResult?.error,
        processingTime: Date.now() - startTime
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

  private async saveCardData(pythonOutput: any, cardNames: string[]): Promise<void> {
    if (!this.isDatabaseAvailable()) return;

    try {
      if (cardNames.length === 1) {
        await this.saveSingleCard(pythonOutput);
      } else {
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

  private async saveSingleCard(cardData: any, cardNameOverride?: string): Promise<void> {
    const name = cardNameOverride || cardData.card_name;
    if (!name) return;

    const edhrec: Record<string, any> = { lastFetched: new Date() };
    if (cardData.commander_data?.rank != null) edhrec.commanderRank = cardData.commander_data.rank;
    if (cardData.commander_data?.num_decks != null) edhrec.totalDecks = cardData.commander_data.num_decks;
    if (Array.isArray(cardData.combos)) edhrec.combos = cardData.combos;
    if (cardData.recommendations) edhrec.recommendations = cardData.recommendations;

    await CardModel.findOneAndUpdate(
      { name },
      { $set: { edhrec, lastUpdated: new Date() } },
      { upsert: false }
    );
  }

  public async getCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;

      const card = await CardModel.findOne({
        name: new RegExp(`^${escapeRegex(cardName)}$`, 'i')
      });

      if (!card) {
        res.status(404).json({
          success: false,
          error: 'Card not found',
          suggestion: 'Try ingesting the card first via POST /api/scryfall/ingest'
        });
        return;
      }

      res.status(200).json({ success: true, card });

    } catch (error) {
      console.error('Error retrieving card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async searchCards(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, page = '1', limit = '10', isCommander, hasCombos } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;

      const searchQuery: any = {};
      if (query) searchQuery.$text = { $search: query as string };
      if (isCommander === 'true') searchQuery.investmentSignals = 'is_commander';
      if (hasCombos === 'true') searchQuery.investmentSignals = 'has_combos';

      const [cards, total] = await Promise.all([
        CardModel.find(searchQuery)
          .sort(query ? { score: { $meta: 'textScore' } } : { lastUpdated: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        CardModel.countDocuments(searchQuery)
      ]);

      res.status(200).json({
        success: true,
        cards,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
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

  public async getInvestmentCards(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '20' } = req.query;
      const limitNum = parseInt(limit as string) || 20;

      const cards = await CardModel.find({
        $or: [
          { investmentSignals: 'is_commander' },
          { investmentSignals: 'has_combos' },
          { investmentSignals: 'high_synergy' }
        ]
      })
        .sort({ investmentScore: -1 })
        .limit(limitNum)
        .lean();

      res.status(200).json({
        success: true,
        cards,
        criteria: ['Is a commander', 'Has combo potential', 'High synergy score']
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

  public async deleteCard(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;

      const result = await CardModel.findOneAndDelete({
        name: new RegExp(`^${escapeRegex(cardName)}$`, 'i')
      });

      if (!result) {
        res.status(404).json({ success: false, error: 'Card not found' });
        return;
      }

      res.status(200).json({ success: true, message: `Card "${cardName}" deleted successfully` });

    } catch (error) {
      console.error('Error deleting card:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getCardPricing(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;

      const products = await this.tcgService.searchMagicProducts(cardName, 10);

      if (products.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Card not found in TCGPlayer database',
          suggestion: 'Try a different card name or check spelling'
        });
        return;
      }

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

  public async initializeTCGData(_req: Request, res: Response): Promise<void> {
    try {
      await this.tcgService.initializeMagicData();
      res.status(200).json({ success: true, message: 'TCGPlayer Magic data initialization completed' });
    } catch (error) {
      console.error('Error initializing TCG data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize TCGPlayer data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async searchTCGProducts(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
        return;
      }

      const products = await this.tcgService.searchMagicProducts(q, parseInt(limit as string));

      res.status(200).json({ success: true, query: q, results: products.length, products });

    } catch (error) {
      console.error('Error searching TCG products:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getEnhancedCardData(req: Request, res: Response): Promise<void> {
    try {
      const { cardName } = req.params;

      const cardData = this.isDatabaseAvailable()
        ? await CardModel.findOne({ name: new RegExp(`^${escapeRegex(cardName)}$`, 'i') })
        : null;

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
        cardData,
        tcgPlayerData: { matchingProducts: pricingData.length, products: pricingData },
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

  public async initializeSets(req: Request, res: Response): Promise<void> {
    try {
      const { sets = [] } = req.body;

      if (!Array.isArray(sets)) {
        res.status(400).json({ success: false, error: 'Sets must be an array of set names' });
        return;
      }

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
        sets: sets.map(set => ({ name: set.name, groupId: set.groupId, endpoint: set.endpoint }))
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
