import { ProviderHttpClient } from './httpClient';
import { mapTOAMagicResponseToPricePoints } from './mappers/toaMagicMapper';
import { CardQuery, IFinancialDataProvider, ProviderResult } from './types';

export class TOAMagicProvider implements IFinancialDataProvider {
  public readonly providerName = 'toamagic';
  private readonly client: ProviderHttpClient;

  constructor() {
    const baseURL = process.env.TOA_MAGIC_BASE_URL || '';
    const apiKey = process.env.TOA_MAGIC_API_KEY || '';
    this.validateConfig();
    this.client = new ProviderHttpClient(this.providerName, {
      baseURL,
      retries: 3,
      timeoutMs: 9000,
      headers: { 'X-API-Key': apiKey }
    });
  }

  validateConfig(): void {
    if (!process.env.TOA_MAGIC_API_KEY) throw new Error('TOA_MAGIC_API_KEY is required');
    if (!process.env.TOA_MAGIC_BASE_URL) throw new Error('TOA_MAGIC_BASE_URL is required');
  }

  async fetchPrices(query: CardQuery): Promise<ProviderResult> {
    try {
      const payload = await this.client.request<any>({ method: 'GET', url: '/api/market/prices', params: { cardName: query.cardName } });
      return { ok: true, data: mapTOAMagicResponseToPricePoints(payload, query) };
    } catch (error) {
      return { ok: false, error: error as any };
    }
  }
}
