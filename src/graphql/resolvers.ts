import { GraphQLError } from 'graphql';
import { CardDataPipelineService, ScryfallService } from '../services';
import { InputValidationError, mapGraphQLError } from './errors';

const scryfallService = ScryfallService.getInstance();
const pipelineService = CardDataPipelineService.getInstance();

function validateName(name: string): string {
  const normalized = (name || '').trim();
  if (!normalized) throw new InputValidationError('name is required');
  if (normalized.length > 200) throw new InputValidationError('name is too long');
  return normalized;
}

function normalizeCard(card: any) {
  if (!card) return null;
  return {
    ...card,
    id: String(card._id ?? card.scryfallId),
    lastUpdated: new Date(card.lastUpdated || Date.now()).toISOString(),
    financialSnapshot: pipelineService.getFinancialSnapshot(card)
  };
}

export const rootResolvers = {
  async cards({ filter = {} }: any) {
    try {
      const result = await pipelineService.getCards(filter);
      return {
        ...result,
        cards: result.cards.map(normalizeCard)
      };
    } catch (error) {
      mapGraphQLError(error);
    }
  },

  async card({ name }: { name: string }) {
    try {
      const validatedName = validateName(name);
      const card = await pipelineService.getCard(validatedName);
      return normalizeCard(card);
    } catch (error) {
      mapGraphQLError(error);
    }
  },

  async clusters({ limitPerCluster = 10 }: { limitPerCluster?: number }) {
    try {
      if (limitPerCluster < 1 || limitPerCluster > 100) {
        throw new InputValidationError('limitPerCluster must be between 1 and 100');
      }
      const clusters = await pipelineService.getClusters(limitPerCluster);
      return clusters.map((cluster) => ({
        ...cluster,
        cards: cluster.cards.map(normalizeCard)
      }));
    } catch (error) {
      mapGraphQLError(error);
    }
  },

  async syncScryfall({ limit = 500 }: { limit?: number }) {
    try {
      if (limit < 1 || limit > 5000) throw new InputValidationError('limit must be between 1 and 5000');
      return scryfallService.ingestAllCards(limit);
    } catch (error) {
      mapGraphQLError(error);
    }
  },

  async enrichCard({ name }: { name: string }) {
    try {
      const validatedName = validateName(name);
      const success = await pipelineService.enrichCard(validatedName);
      if (!success) throw new GraphQLError('Failed to enrich card', { extensions: { code: 'ENRICHMENT_FAILED' } });
      return { success };
    } catch (error) {
      mapGraphQLError(error);
    }
  }
};
