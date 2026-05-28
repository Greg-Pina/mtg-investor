import { ProviderHttpClient } from './httpClient';
import { mapTOAMagicResponseToPricePoints } from './mappers/toaMagicMapper';
import { CardQuery, IFinancialDataProvider, ProviderResult } from './types';

export class TOAMagicProvider implements IFinancialDataProvider {
  public readonly providerName = 'toamagic';
  private client?: ProviderHttpClient;

  validateConfig(): void {
    if (!process.env.TOA_MAGIC_API_KEY) throw new Error('TOA_MAGIC_API_KEY is required');
    if (!process.env.TOA_MAGIC_BASE_URL) throw new Error('TOA_MAGIC_BASE_URL is required');
  }

  private getClient(): ProviderHttpClient {
    if (!this.client) {
      this.client = new ProviderHttpClient(this.providerName, {
        baseURL: process.env.TOA_MAGIC_BASE_URL!,
        retries: 3,
        timeoutMs: 9000,
        headers: { 'X-API-Key': process.env.TOA_MAGIC_API_KEY! }
      });
    }
    return this.client;
  }

  async fetchPrices(query: CardQuery): Promise<ProviderResult> {
    try {
      this.validateConfig();
      const payload = await this.getClient().request<any>({ method: 'GET', url: '/api/market/prices', params: { cardName: query.cardName } });
      return { ok: true, data: mapTOAMagicResponseToPricePoints(payload, query) };
    } catch (error) {
      return {
        ok: false,
        error: { provider: this.providerName, code: 'CONFIG', message: (error as Error).message }
      };
    }
  }
}
