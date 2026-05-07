import { ProviderHttpClient } from './httpClient';
import { mapManaPoolResponseToPricePoints } from './mappers/manaPoolMapper';
import { CardQuery, IFinancialDataProvider, ProviderResult } from './types';

export class ManaPoolProvider implements IFinancialDataProvider {
  public readonly providerName = 'manapool';
  private readonly client: ProviderHttpClient;
  private readonly token: string;

  constructor() {
    this.token = process.env.MANAPOOL_AUTH_TOKEN || '';
    const baseURL = process.env.MANAPOOL_BASE_URL || '';
    this.validateConfig();
    this.client = new ProviderHttpClient(this.providerName, {
      baseURL,
      retries: 2,
      timeoutMs: 9000,
      headers: { 'X-Auth-Token': this.token }
    });
  }

  validateConfig(): void {
    if (!this.token) throw new Error('MANAPOOL_AUTH_TOKEN is required');
    if (!process.env.MANAPOOL_BASE_URL) throw new Error('MANAPOOL_BASE_URL is required');
  }

  async fetchPrices(query: CardQuery): Promise<ProviderResult> {
    try {
      const payload = await this.client.request<any>({ method: 'GET', url: '/v1/cards/pricing', params: { name: query.cardName } });
      return { ok: true, data: mapManaPoolResponseToPricePoints(payload, query) };
    } catch (error) {
      return { ok: false, error: error as any };
    }
  }
}
