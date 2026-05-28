import { ProviderHttpClient } from './httpClient';
import { mapManaPoolResponseToPricePoints } from './mappers/manaPoolMapper';
import { CardQuery, IFinancialDataProvider, ProviderResult } from './types';

export class ManaPoolProvider implements IFinancialDataProvider {
  public readonly providerName = 'manapool';
  private client?: ProviderHttpClient;

  validateConfig(): void {
    if (!process.env.MANAPOOL_AUTH_TOKEN) throw new Error('MANAPOOL_AUTH_TOKEN is required');
    if (!process.env.MANAPOOL_BASE_URL) throw new Error('MANAPOOL_BASE_URL is required');
  }

  private getClient(): ProviderHttpClient {
    if (!this.client) {
      this.client = new ProviderHttpClient(this.providerName, {
        baseURL: process.env.MANAPOOL_BASE_URL!,
        retries: 2,
        timeoutMs: 9000,
        headers: { 'X-Auth-Token': process.env.MANAPOOL_AUTH_TOKEN! }
      });
    }
    return this.client;
  }

  async fetchPrices(query: CardQuery): Promise<ProviderResult> {
    try {
      this.validateConfig();
      const payload = await this.getClient().request<any>({ method: 'GET', url: '/v1/cards/pricing', params: { name: query.cardName } });
      return { ok: true, data: mapManaPoolResponseToPricePoints(payload, query) };
    } catch (error) {
      return {
        ok: false,
        error: { provider: this.providerName, code: 'CONFIG', message: (error as Error).message }
      };
    }
  }
}
