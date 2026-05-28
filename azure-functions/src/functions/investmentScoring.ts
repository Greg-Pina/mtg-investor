import { app, InvocationContext, StorageQueueTrigger } from '@azure/functions';
import { ensureConnected } from '../shared/db';
import mongoose from 'mongoose';

// Queue trigger — fires when a message lands in the mtg-score queue.
// Also has a timer trigger as a standalone backup at 03:00 UTC.
app.storageQueue('investmentScoringQueue', {
  queueName: process.env.QUEUE_NAME_SCORE ?? 'mtg-score',
  connection: 'AZURE_STORAGE_CONNECTION_STRING',
  handler: async (message: StorageQueueTrigger, context: InvocationContext) => {
    context.log('[investmentScoring] Queue message received:', message);
    await runScoring(context);
  }
});

app.timer('investmentScoringTimer', {
  schedule: '0 0 3 * * *',
  handler: async (_timer: unknown, context: InvocationContext) => {
    context.log('[investmentScoring] Timer trigger fired.');
    await runScoring(context);
  }
});

async function runScoring(context: InvocationContext): Promise<void> {
  await ensureConnected();

  const CardSchema = new mongoose.Schema({
    scryfallId: String, name: String, rarity: String,
    edhrec: mongoose.Schema.Types.Mixed,
    priceHistory: [{ date: Date, usd: Number, usdFoil: Number, market: Number, source: String }],
    investmentScore: Number,
    investmentSignals: [String]
  }, { collection: 'cards' });
  const Card = mongoose.models['FnCard2'] ?? mongoose.model('FnCard2', CardSchema);

  let updated = 0;
  const cursor = Card.find({}).cursor();

  for await (const card of cursor) {
    const { score, signals } = computeScore(card);
    await Card.updateOne({ _id: card._id }, { $set: { investmentScore: score, investmentSignals: signals } });
    updated++;
  }

  context.log(`[investmentScoring] Updated ${updated} card scores.`);
}

function computeScore(card: any): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  const edhrec = card.edhrec;

  if (edhrec) {
    if (edhrec.commanderRank != null && edhrec.commanderRank > 0) {
      score += Math.max(0, 1 - edhrec.commanderRank / 10000) * 30;
      signals.push('is_commander');
    }
    if (edhrec.totalDecks != null && edhrec.totalDecks > 0) {
      score += Math.min(1, edhrec.totalDecks / 10000) * 25;
      if (edhrec.totalDecks > 1000) signals.push('high_deck_count');
    }
    if (edhrec.combos?.length > 0) {
      score += Math.min(1, edhrec.combos.length / 10) * 20;
      signals.push('has_combos');
    }
  }

  if (card.priceHistory?.length >= 2) {
    const markets = [...card.priceHistory]
      .sort((a: any, b: any) => a.date - b.date)
      .map((p: any) => p.market)
      .filter((v: any): v is number => v != null);
    if (markets.length >= 2 && markets[0] > 0) {
      const change = (markets[markets.length - 1] - markets[0]) / markets[0];
      score += change * 10;
      if (change > 0.2) signals.push('price_rising');
      if (change < -0.2) signals.push('price_falling');
    }
  }

  if (card.rarity === 'mythic') { score += 5; signals.push('mythic'); }
  else if (card.rarity === 'rare') score += 2;

  return { score: Math.max(0, Math.round(score * 10) / 10), signals };
}
