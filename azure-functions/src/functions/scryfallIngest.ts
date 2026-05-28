import { app, InvocationContext, Timer } from '@azure/functions';
import { QueueServiceClient } from '@azure/storage-queue';
import { ensureConnected } from '../shared/db';
import mongoose from 'mongoose';
import axios from 'axios';

// Timer trigger — runs daily at 02:00 UTC
// After ingesting, it enqueues a "score-all" message for the scoring function.
app.timer('scryfallIngest', {
  schedule: '0 0 2 * * *', // Azure uses 6-part NCRONTAB: ss mm hh dd MM dow
  handler: async (_timer: Timer, context: InvocationContext) => {
    context.log('[scryfallIngest] Starting daily Scryfall ingest...');

    await ensureConnected();

    // Dynamically import CardModel (mongoose schema defined in main src)
    // We keep a minimal inline schema here to avoid circular deps.
    const CardSchema = new mongoose.Schema({ scryfallId: { type: String, unique: true }, name: String,
      setCode: String, setName: String, collectorNumber: String, typeLine: String,
      oracleText: String, colors: [String], rarity: String, imageUris: mongoose.Schema.Types.Mixed,
      prices: mongoose.Schema.Types.Mixed, tcgplayerId: Number, scryfall: mongoose.Schema.Types.Mixed,
      lastUpdated: { type: Date, default: Date.now }
    }, { collection: 'cards' });
    const Card = mongoose.models['FnCard'] ?? mongoose.model('FnCard', CardSchema);

    const baseUrl = 'https://api.scryfall.com';
    let page = 1;
    let saved = 0;
    let hasMore = true;
    const limit = 2000;
    const seen = new Set<string>();

    while (hasMore && saved < limit) {
      const { data } = await axios.get(
        `${baseUrl}/cards/search?q=*&order=set&unique=prints&page=${page}`,
        { timeout: 20000 }
      );
      const batch: any[] = (data.data ?? []).filter((c: any) => !seen.has(c.id));
      const toSave = batch.slice(0, limit - saved);

      for (const c of toSave) {
        await Card.findOneAndUpdate(
          { scryfallId: c.id },
          {
            scryfallId: c.id, name: c.name, setCode: c.set, setName: c.set_name,
            collectorNumber: c.collector_number, typeLine: c.type_line, oracleText: c.oracle_text,
            colors: c.colors, rarity: c.rarity, imageUris: c.image_uris, prices: c.prices,
            tcgplayerId: c.tcgplayer_id, scryfall: c, lastUpdated: new Date()
          },
          { upsert: true }
        );
        seen.add(c.id);
      }
      saved += toSave.length;
      hasMore = !!data.has_more && saved < limit;
      page++;
      if (!data.has_more) break;
    }

    context.log(`[scryfallIngest] Done — saved ${saved} cards.`);

    // Enqueue a message to trigger investment scoring
    await enqueueScoreAll(context);
  }
});

async function enqueueScoreAll(context: InvocationContext): Promise<void> {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const queueName = process.env.QUEUE_NAME_SCORE ?? 'mtg-score';
  if (!connStr || connStr === 'UseDevelopmentStorage=true') {
    context.log('[scryfallIngest] Storage not configured — skipping score queue message.');
    return;
  }
  const queueClient = QueueServiceClient.fromConnectionString(connStr).getQueueClient(queueName);
  await queueClient.createIfNotExists();
  const msg = Buffer.from(JSON.stringify({ action: 'score-all', triggeredAt: new Date().toISOString() })).toString('base64');
  await queueClient.sendMessage(msg);
  context.log(`[scryfallIngest] Enqueued score-all message to ${queueName}.`);
}
