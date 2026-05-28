import { QueueServiceClient } from '@azure/storage-queue';
import { logger } from '../utils/logger';

export class QueueService {
  private static instance: QueueService;
  private queueServiceClient: QueueServiceClient | null = null;
  private enabled = false;

  private constructor() {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr || connStr === 'UseDevelopmentStorage=true') {
      logger.warn('[QueueService] AZURE_STORAGE_CONNECTION_STRING not set — queue dispatch disabled.');
      return;
    }
    try {
      this.queueServiceClient = QueueServiceClient.fromConnectionString(connStr);
      this.enabled = true;
      logger.info('[QueueService] Azure Storage Queue initialized.');
    } catch (err: any) {
      logger.warn(`[QueueService] Failed to initialize queue client: ${err.message}`);
    }
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  async enqueue(queueName: string, payload: unknown): Promise<boolean> {
    if (!this.enabled || !this.queueServiceClient) return false;
    try {
      const client = this.queueServiceClient.getQueueClient(queueName);
      await client.createIfNotExists();
      const msg = Buffer.from(JSON.stringify(payload)).toString('base64');
      await client.sendMessage(msg);
      logger.debug(`[QueueService] Enqueued to ${queueName}`);
      return true;
    } catch (err: any) {
      logger.warn(`[QueueService] Enqueue failed: ${err.message}`);
      return false;
    }
  }

  async enqueueEnrichment(cardName: string): Promise<boolean> {
    const queueName = process.env.QUEUE_NAME_ENRICH ?? 'mtg-enrich';
    return this.enqueue(queueName, { cardName });
  }

  async enqueueScoring(): Promise<boolean> {
    const queueName = process.env.QUEUE_NAME_SCORE ?? 'mtg-score';
    return this.enqueue(queueName, { action: 'score-all', triggeredAt: new Date().toISOString() });
  }
}
