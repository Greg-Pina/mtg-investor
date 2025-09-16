import { Router } from 'express';
import { JSONSchemaType } from 'ajv';
import { MTGController, MTGCardRequest } from '../controllers';
import { jsonParsingMiddleware } from '../middleware';

const router = Router();
const mtgController = new MTGController();

// JSON schema for MTG card request validation
const mtgCardRequestSchema: JSONSchemaType<MTGCardRequest> = {
  type: 'object',
  properties: {
    cardName: {
      type: 'string',
      nullable: true,
      minLength: 1,
      maxLength: 200
    },
    cardNames: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 200
      },
      maxItems: 50 // Limit to prevent abuse
    },
    cards: {
      type: 'array',
      nullable: true,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 200
      },
      maxItems: 50
    },
    forceUpdate: {
      type: 'boolean',
      nullable: true
    },
    options: {
      type: 'object',
      nullable: true,
      properties: {
        timeout: {
          type: 'number',
          nullable: true,
          minimum: 5000,   // 5 seconds minimum
          maximum: 180000  // 3 minutes maximum
        },
        includeAnalysis: {
          type: 'boolean',
          nullable: true
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false,
  anyOf: [
    { required: ['cardName'] },
    { required: ['cardNames'] },
    { required: ['cards'] }
  ]
};

// Routes

/**
 * POST /process - Process MTG card data
 * Body: { cardName: string } | { cardNames: string[] } | { cards: string[] }
 */
router.post(
  '/process',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 1024 * 1024 }), // 1MB limit
  jsonParsingMiddleware.sanitizeJson(),
  jsonParsingMiddleware.validateJson(mtgCardRequestSchema),
  mtgController.processCardData.bind(mtgController)
);

/**
 * GET /card/:cardName - Get specific card data
 */
router.get(
  '/card/:cardName',
  mtgController.getCard.bind(mtgController)
);

/**
 * GET /search - Search for cards
 * Query params: q, page, limit, isCommander, hasCombos
 */
router.get(
  '/search',
  mtgController.searchCards.bind(mtgController)
);

/**
 * GET /investment - Get cards with investment potential
 * Query params: limit
 */
router.get(
  '/investment',
  mtgController.getInvestmentCards.bind(mtgController)
);

/**
 * GET /pricing/:cardName - Get TCGPlayer pricing for a card
 */
router.get(
  '/pricing/:cardName',
  mtgController.getCardPricing.bind(mtgController)
);

/**
 * GET /enhanced/:cardName - Get enhanced card data with EDHREC and TCGPlayer data
 */
router.get(
  '/enhanced/:cardName',
  mtgController.getEnhancedCardData.bind(mtgController)
);

/**
 * POST /tcg/initialize - Initialize TCGPlayer data
 */
router.post(
  '/tcg/initialize',
  mtgController.initializeTCGData.bind(mtgController)
);

/**
 * GET /tcg/search - Search TCGPlayer products
 * Query params: q, limit
 */
router.get(
  '/tcg/search',
  mtgController.searchTCGProducts.bind(mtgController)
);

/**
 * POST /sets/initialize - Initialize specific Magic sets from TCGCSV
 * Body: { sets: string[] } - Array of set names to initialize
 */
router.post(
  '/sets/initialize',
  jsonParsingMiddleware.parseJsonWithLimits({ maxSize: 1024 * 1024 }),
  jsonParsingMiddleware.sanitizeJson(),
  mtgController.initializeSets.bind(mtgController)
);

/**
 * GET /sets - Get available Magic sets
 * Query params: category (optional) - classic, modern, masters, commander, universes-beyond, un-sets
 */
router.get(
  '/sets',
  mtgController.getAvailableSets.bind(mtgController)
);

/**
 * DELETE /card/:cardName - Delete card data
 */
router.delete(
  '/card/:cardName',
  mtgController.deleteCard.bind(mtgController)
);

export default router;