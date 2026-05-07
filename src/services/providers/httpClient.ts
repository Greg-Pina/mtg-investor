import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ProviderError } from './types';

export interface HttpClientOptions {
  baseURL: string;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export class ProviderHttpClient {
  private client: AxiosInstance;
  private retries: number;

  constructor(private readonly provider: string, options: HttpClientOptions) {
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeoutMs ?? 8000,
      headers: options.headers
    });
    this.retries = options.retries ?? 2;
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await this.client.request<T>(config);
        return response.data;
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error, attempt)) break;
      }
    }
    throw this.normalizeError(lastError);
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.retries) return false;
    if (!axios.isAxiosError(error)) return false;
    if (error.code === 'ECONNABORTED') return true;
    if (!error.response) return true;
    return error.response.status >= 500;
  }

  private normalizeError(error: unknown): ProviderError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        return { provider: this.provider, code: 'TIMEOUT', message: 'Request timed out', cause: error };
      }
      if (!axiosError.response) {
        return { provider: this.provider, code: 'NETWORK', message: axiosError.message, cause: error };
      }
      const status = axiosError.response.status;
      return {
        provider: this.provider,
        code: status === 401 || status === 403 ? 'AUTH' : 'HTTP',
        message: `HTTP ${status}`,
        status,
        cause: axiosError.response.data
      };
    }

    return {
      provider: this.provider,
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown provider error',
      cause: error
    };
  }
}
