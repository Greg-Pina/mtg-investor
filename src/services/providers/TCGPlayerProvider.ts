import { ProviderHttpClient } from './httpClient';
import { mapTCGPlayerResponseToPricePoints } from './mappers/tcgplayerMapper';
import { CardQuery, IFinancialDataProvider, ProviderResult } from './types';

export class TCGPlayerProvider implements IFinancialDataProvider {
  public readonly providerName = 'tcgplayer';
  private readonly client: ProviderHttpClient;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.TCGPLAYER_API_KEY || '';
    const baseURL = process.env.TCGPLAYER_BASE_URL || '';
    this.validateConfig();
    this.client = new ProviderHttpClient(this.providerName, {
      baseURL,
      retries: 2,
      timeoutMs: 10000,
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
  }

  validateConfig(): void {
    if (!this.apiKey) throw new Error('TCGPLAYER_API_KEY is required');
    if (!process.env.TCGPLAYER_BASE_URL) throw new Error('TCGPLAYER_BASE_URL is required');
  }

  async fetchPrices(query: CardQuery): Promise<ProviderResult> {
    try {
      const payload = await this.client.request<any>({ method: 'GET', url: '/prices', params: { q: query.cardName } });
      return { ok: true, data: mapTCGPlayerResponseToPricePoints(payload, query) };
    } catch (error) {
      return { ok: false, error: error as any };
    }
  }
}
