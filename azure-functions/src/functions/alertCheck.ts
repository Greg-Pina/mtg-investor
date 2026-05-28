import { app, InvocationContext } from '@azure/functions';
import { ensureConnected } from '../shared/db';
import mongoose from 'mongoose';

// Timer trigger — runs daily at 03:30 UTC after scoring is complete
app.timer('alertCheck', {
  schedule: '0 30 3 * * *',
  handler: async (_timer: unknown, context: InvocationContext) => {
    context.log('[alertCheck] Checking price alerts...');

    await ensureConnected();

    const AlertSchema = new mongoose.Schema({
      sessionId: String, cardId: mongoose.Schema.Types.ObjectId,
      targetPrice: Number, direction: String, status: String,
      triggeredAt: Date, email: String
    }, { collection: 'alerts' });
    const CardSchema = new mongoose.Schema({
      prices: mongoose.Schema.Types.Mixed,
      priceHistory: [{ date: Date, market: Number, source: String }]
    }, { collection: 'cards' });

    const Alert = mongoose.models['FnAlert'] ?? mongoose.model('FnAlert', AlertSchema);
    const Card = mongoose.models['FnCard3'] ?? mongoose.model('FnCard3', CardSchema);

    const pending = await Alert.find({ status: 'pending' }).lean();
    let triggered = 0;

    for (const alert of pending) {
      const card = await Card.findById(alert.cardId).select('name prices priceHistory').lean() as any;
      if (!card) continue;

      const price = getPrice(card);
      if (price == null) continue;

      const fired =
        (alert.direction === 'below' && price <= alert.targetPrice) ||
        (alert.direction === 'above' && price >= alert.targetPrice);

      if (fired) {
        await Alert.updateOne({ _id: alert._id }, { status: 'triggered', triggeredAt: new Date() });
        triggered++;
        context.log(`[alertCheck] Alert triggered for card ${alert.cardId}: $${price} (target ${alert.direction} $${alert.targetPrice})`);
      }
    }

    context.log(`[alertCheck] Done: ${pending.length} checked, ${triggered} triggered.`);
  }
});

function getPrice(card: any): number | null {
  if (card.priceHistory?.length) {
    const sorted = [...card.priceHistory].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted.find((p: any) => p.market != null);
    if (latest) return latest.market;
  }
  const usd = card.prices?.usd;
  return usd ? parseFloat(usd) : null;
}
