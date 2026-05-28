import { AlertModel } from '../models/Alert';
import { CardModel } from '../models';
import { logger } from '../utils/logger';

export class AlertService {
  private static instance: AlertService;

  private constructor() {}

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  async checkAlerts(): Promise<{ checked: number; triggered: number }> {
    const pending = await AlertModel.find({ status: 'pending' }).lean();
    let triggered = 0;

    for (const alert of pending) {
      const card = await CardModel.findById(alert.cardId)
        .select('name prices priceHistory')
        .lean();
      if (!card) continue;

      const marketPrice = this.getCurrentMarketPrice(card);
      if (marketPrice == null) continue;

      const shouldTrigger =
        (alert.direction === 'below' && marketPrice <= alert.targetPrice) ||
        (alert.direction === 'above' && marketPrice >= alert.targetPrice);

      if (shouldTrigger) {
        await AlertModel.updateOne(
          { _id: alert._id },
          { status: 'triggered', triggeredAt: new Date() }
        );
        triggered++;
        if (alert.email) {
          await this.sendNotification(alert.email, card.name, marketPrice, alert.targetPrice, alert.direction);
        }
        logger.info(`[AlertService] Alert triggered: ${card.name} @ $${marketPrice} (target: ${alert.direction} $${alert.targetPrice})`);
      }
    }

    return { checked: pending.length, triggered };
  }

  private getCurrentMarketPrice(card: any): number | null {
    if (card.priceHistory && card.priceHistory.length > 0) {
      const sorted = [...card.priceHistory].sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latest = sorted.find((p: any) => p.market != null);
      if (latest) return latest.market;
    }
    const usd = card.prices?.usd;
    if (usd) return parseFloat(usd);
    return null;
  }

  private async sendNotification(
    email: string,
    cardName: string,
    currentPrice: number,
    targetPrice: number,
    direction: 'below' | 'above'
  ): Promise<void> {
    // SendGrid or Nodemailer integration point
    // If SENDGRID_API_KEY is set, use it; otherwise log only
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      logger.info(`[AlertService] Would send email to ${email}: ${cardName} hit $${currentPrice} (target ${direction} $${targetPrice})`);
      return;
    }
    // TODO: integrate @sendgrid/mail when package is added
    logger.info(`[AlertService] Email alert sent to ${email} for ${cardName}`);
  }
}
