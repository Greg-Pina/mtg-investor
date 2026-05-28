import { app, InvocationContext, StorageQueueTrigger } from '@azure/functions';
import { ensureConnected } from '../shared/db';
import mongoose from 'mongoose';
import axios from 'axios';

interface EnrichMessage {
  cardName: string;
  scryfallId?: string;
}

// Queue trigger — fires when a card enrichment request is enqueued
app.storageQueue('enrichCard', {
  queueName: process.env.QUEUE_NAME_ENRICH ?? 'mtg-enrich',
  connection: 'AZURE_STORAGE_CONNECTION_STRING',
  handler: async (message: StorageQueueTrigger, context: InvocationContext) => {
    const payload = message as unknown as EnrichMessage;
    if (!payload?.cardName) {
      context.warn('[enrichCard] Invalid message — missing cardName.');
      return;
    }

    context.log(`[enrichCard] Enriching: ${payload.cardName}`);
    await ensureConnected();

    const CardSchema = new mongoose.Schema({
      scryfallId: String, name: String,
      edhrec: mongoose.Schema.Types.Mixed, lastUpdated: Date
    }, { collection: 'cards' });
    const Card = mongoose.models['FnCard4'] ?? mongoose.model('FnCard4', CardSchema);

    const edhrecData = await fetchEDHRECData(payload.cardName, context);
    if (edhrecData) {
      await Card.updateOne(
        { name: payload.cardName },
        { $set: { edhrec: { ...edhrecData, lastFetched: new Date() }, lastUpdated: new Date() } }
      );
      context.log(`[enrichCard] EDHREC data saved for ${payload.cardName}.`);
    }
  }
});

async function fetchEDHRECData(name: string, context: InvocationContext): Promise<Record<string, any> | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const base = 'https://json.edhrec.com/pages';

  try {
    // Try commander page first
    const { data } = await axios.get(`${base}/commanders/${slug}.json`, { timeout: 15000 });
    return parseEDHRECPage(data);
  } catch {
    // Fall back to card page
    try {
      const { data } = await axios.get(`${base}/cards/${slug}.json`, { timeout: 15000 });
      return parseEDHRECPage(data);
    } catch (err: any) {
      if (err?.response?.status !== 404) {
        context.warn(`[enrichCard] EDHREC fetch failed for "${name}": ${err.message}`);
      }
      return null;
    }
  }
}

function parseEDHRECPage(page: any): Record<string, any> {
  const jsonDict = page?.container?.json_dict ?? page?.json_dict ?? {};
  const header = jsonDict?.header ?? page?.header ?? {};
  return {
    commanderRank: header?.rank,
    totalDecks: header?.num_decks ?? header?.total_decks,
    combos: jsonDict?.combos ?? page?.combos ?? []
  };
}
