import { ProviderHttpClient } from './httpClient';
import { mapTCGPlayerResponseToPricePoints } from './mappers/tcgplayerMapper';
import { CardQuery, IFinancialDataProvider, ProviderResult } from './types';

export class TCGPlayerProvider implements IFinancialDataProvider {
  public readonly providerName = 'tcgplayer';
  private client?: ProviderHttpClient;

  validateConfig(): void {
    if (!process.env.TCGPLAYER_API_KEY) throw new Error('TCGPLAYER_API_KEY is required');
    if (!process.env.TCGPLAYER_BASE_URL) throw new Error('TCGPLAYER_BASE_URL is required');
  }

  private getClient(): ProviderHttpClient {
    if (!this.client) {
      this.client = new ProviderHttpClient(this.providerName, {
        baseURL: process.env.TCGPLAYER_BASE_URL!,
        retries: 2,
        timeoutMs: 10000,
        headers: { Authorization: `Bearer ${process.env.TCGPLAYER_API_KEY}` }
      });
    }
    return this.client;
  }

  async fetchPrices(query: CardQuery): Promise<ProviderResult> {
    try {
      this.validateConfig();
      const payload = await this.getClient().request<any>({ method: 'GET', url: '/prices', params: { q: query.cardName } });
      return { ok: true, data: mapTCGPlayerResponseToPricePoints(payload, query) };
    } catch (error) {
      return {
        ok: false,
        error: { provider: this.providerName, code: 'CONFIG', message: (error as Error).message }
      };
    }
  }
}
