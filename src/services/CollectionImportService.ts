import { parse } from 'csv-parse';
import { Response } from 'express';
import { logger } from '../utils/logger';
import { CollectionCard } from '../models/CollectionCard';
import { ImportJob } from '../models/ImportJob';
import { CardModel as Card } from '../models/Card';
import { echoMTGService } from './EchoMTGService';
import { ICollectionImporter, ParsedCard } from './importers/ICollectionImporter';
import { ManaBoxImporter } from './importers/ManaBoxImporter';
import { DragonShieldImporter } from './importers/DragonShieldImporter';
import { TCGPlayerCollectionImporter } from './importers/TCGPlayerCollectionImporter';
import { EchoMTGImporter } from './importers/EchoMTGImporter';
import { GenericImporter } from './importers/GenericImporter';

const IMPORTERS: ICollectionImporter[] = [
  new ManaBoxImporter(),
  new DragonShieldImporter(),
  new TCGPlayerCollectionImporter(),
  new EchoMTGImporter(),
  new GenericImporter(), // must be last
];

export type MergeStrategy = 'sum' | 'replace';

export interface PreviewResult {
  detectedSource: string;
  confidence: number;
  sampleRows: ParsedCard[];
  totalRows: number;
  estimatedInsert: number;
  estimatedUpdate: number;
  estimatedSkip: number;
  defaultsApplied: string[];
}

export interface CommitOptions {
  mergeStrategy?: MergeStrategy;
  sourceOverride?: string;
}

export interface CommitResult {
  jobId: string;
  inserted: number;
  updated: number;
  skipped: number;
  errorCount: number;
  durationMs: number;
}

export interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  processed: number;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  echoSyncing?: boolean;
  message?: string;
}

// In-memory SSE subscriber store: jobId → response streams
const sseSubscribers = new Map<string, Set<Response>>();

export function subscribeToProgress(jobId: string, res: Response): void {
  if (!sseSubscribers.has(jobId)) sseSubscribers.set(jobId, new Set());
  sseSubscribers.get(jobId)!.add(res);
  res.on('close', () => sseSubscribers.get(jobId)?.delete(res));
}

function emitProgress(jobId: string, event: ProgressEvent): void {
  const subscribers = sseSubscribers.get(jobId);
  if (!subscribers?.size) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subscribers) {
    try { res.write(data); } catch { /* client disconnected */ }
  }
  if (event.type === 'complete' || event.type === 'error') {
    for (const res of subscribers) {
      try { res.end(); } catch { /* already closed */ }
    }
    sseSubscribers.delete(jobId);
  }
}

async function parseCsv(buffer: Buffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    let headers: string[] = [];
    const parser = parse(buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    parser.on('data', (row: Record<string, string>) => {
      if (!headers.length) headers = Object.keys(row);
      rows.push(row);
    });
    parser.on('end', () => resolve({ headers, rows }));
    parser.on('error', reject);
  });
}

function detectImporter(headers: string[], sourceHint?: string): { importer: ICollectionImporter; confidence: number } {
  if (sourceHint) {
    const hinted = IMPORTERS.find(i => i.sourceName === sourceHint.toLowerCase());
    if (hinted) return { importer: hinted, confidence: 1.0 };
  }
  // Try specific importers first (all except GenericImporter at the end)
  for (const importer of IMPORTERS.slice(0, -1)) {
    if (importer.canHandle(headers)) return { importer, confidence: 0.9 };
  }
  return { importer: IMPORTERS[IMPORTERS.length - 1], confidence: 0.5 };
}

async function lookupScryfallId(name: string, setCode: string, collectorNumber?: string): Promise<string | undefined> {
  try {
    const query: Record<string, unknown> = { name: new RegExp(`^${name}$`, 'i') };
    if (setCode) query.setCode = setCode.toUpperCase();
    if (collectorNumber) query.collectorNumber = collectorNumber;
    const card = await Card.findOne(query, { scryfallId: 1 }).lean();
    return card?.scryfallId;
  } catch {
    return undefined;
  }
}

async function upsertCard(
  parsed: ParsedCard,
  jobId: string,
  mergeStrategy: MergeStrategy,
  emidMap: Record<string, number>
): Promise<'inserted' | 'updated' | 'skipped'> {
  const emid = parsed.emid ?? emidMap[parsed.name.toLowerCase()];
  const scryfallId = parsed.scryfallId ?? await lookupScryfallId(parsed.name, parsed.setCode, parsed.collectorNumber);

  // Build the dedup query — prefer emid, then scryfallId, then name+set
  let dedupQuery: Record<string, unknown>;
  if (emid) {
    dedupQuery = { emid, isFoil: parsed.isFoil, condition: parsed.condition, language: parsed.language };
  } else if (scryfallId) {
    dedupQuery = { scryfallId, isFoil: parsed.isFoil, condition: parsed.condition, language: parsed.language };
  } else {
    dedupQuery = { name: parsed.name, setCode: parsed.setCode, isFoil: parsed.isFoil, condition: parsed.condition };
  }

  const existing = await CollectionCard.findOne(dedupQuery).lean();

  if (existing) {
    const updates: Record<string, unknown> = { lastSyncedAt: new Date() };
    if (mergeStrategy === 'sum') {
      updates.quantity = (existing.quantity ?? 0) + parsed.quantity;
    } else {
      updates.quantity = parsed.quantity;
      updates.condition = parsed.condition;
      updates.source = parsed.source;
    }
    if (scryfallId && !existing.scryfallId) updates.scryfallId = scryfallId;
    if (emid && !existing.emid) updates.emid = emid;
    await CollectionCard.updateOne({ _id: existing._id }, { $set: updates });
    return 'updated';
  }

  try {
    await CollectionCard.create({
      ...parsed,
      emid,
      scryfallId,
      importJobId: jobId,
      lastSyncedAt: new Date(),
    });
    return 'inserted';
  } catch (err: any) {
    // Duplicate key — race condition; treat as update
    if (err.code === 11000) {
      await CollectionCard.updateOne(dedupQuery, {
        $inc: { quantity: mergeStrategy === 'sum' ? parsed.quantity : 0 },
        $set: { lastSyncedAt: new Date() },
      });
      return 'updated';
    }
    throw err;
  }
}

class CollectionImportService {
  async preview(buffer: Buffer, sourceHint?: string): Promise<PreviewResult> {
    const { headers, rows } = await parseCsv(buffer);
    const { importer, confidence } = detectImporter(headers, sourceHint);
    const parsed = importer.parse(rows);

    const defaultsApplied: string[] = [];
    const sample = parsed.slice(0, 10);
    if (sample.some(c => c.condition === 'NM' && !rows[0]['Condition'] && !rows[0]['condition'])) {
      defaultsApplied.push('condition defaulted to NM');
    }
    if (sample.some(c => c.language === 'EN' && !rows[0]['Language'] && !rows[0]['language'])) {
      defaultsApplied.push('language defaulted to EN');
    }

    // Rough estimate of inserts vs updates (no DB write)
    const scryfallIds = sample.filter(c => c.scryfallId).map(c => c.scryfallId!);
    const existingCount = scryfallIds.length
      ? await CollectionCard.countDocuments({ scryfallId: { $in: scryfallIds } })
      : 0;
    const estimatedUpdate = Math.round((existingCount / Math.max(sample.length, 1)) * parsed.length);

    return {
      detectedSource: importer.sourceName,
      confidence,
      sampleRows: sample,
      totalRows: rows.length,
      estimatedInsert: parsed.length - estimatedUpdate,
      estimatedUpdate,
      estimatedSkip: rows.length - parsed.length,
      defaultsApplied,
    };
  }

  async commit(
    buffer: Buffer,
    filename: string,
    options: CommitOptions = {},
    sseRes?: Response
  ): Promise<CommitResult> {
    const start = Date.now();
    const { headers, rows } = await parseCsv(buffer);
    const { importer } = detectImporter(headers, options.sourceOverride);
    const parsed = importer.parse(rows);
    const mergeStrategy = options.mergeStrategy ?? 'sum';

    const job = await ImportJob.create({
      source: importer.sourceName,
      filename,
      fileSizeBytes: buffer.length,
      status: 'processing',
      rowsTotal: rows.length,
    });

    const jobId = String(job._id);
    if (sseRes) subscribeToProgress(jobId, sseRes);

    // Step 1: bulk emid resolution via Echo CSV endpoint (if configured)
    let emidMap: Record<string, number> = {};
    if (echoMTGService.isConfigured()) {
      emidMap = await echoMTGService.resolveEmidsFromCsv(buffer, filename);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const importErrors: Array<{ row: number; message: string; raw: string }> = [];
    const BATCH = 50;

    for (let i = 0; i < parsed.length; i += BATCH) {
      const batch = parsed.slice(i, i + BATCH);

      await Promise.all(batch.map(async (card, batchIdx) => {
        const rowNum = i + batchIdx + 2; // 1-based, +1 for header
        try {
          const result = await upsertCard(card, jobId, mergeStrategy, emidMap);
          if (result === 'inserted') inserted++;
          else if (result === 'updated') updated++;
          else skipped++;
        } catch (err: any) {
          skipped++;
          importErrors.push({ row: rowNum, message: err.message ?? 'Unknown error', raw: JSON.stringify(card) });
        }
      }));

      // Update job progress in DB
      await ImportJob.updateOne({ _id: job._id }, { $set: { inserted, updated, skipped, importErrors } });

      // Emit SSE progress
      emitProgress(jobId, {
        type: 'progress',
        processed: Math.min(i + BATCH, parsed.length),
        total: parsed.length,
        inserted,
        updated,
        skipped,
      });
    }

    const durationMs = Date.now() - start;

    // Finalize job
    await ImportJob.updateOne({ _id: job._id }, {
      $set: { status: 'complete', inserted, updated, skipped, importErrors, durationMs, completedAt: new Date() },
    });

    // Step 2: background batch sync to EchoMTG for newly inserted cards
    if (echoMTGService.isConfigured()) {
      emitProgress(jobId, { type: 'progress', processed: parsed.length, total: parsed.length, inserted, updated, skipped, echoSyncing: true });
      setImmediate(async () => {
        try {
          const newCards = await CollectionCard.find({ importJobId: (job._id as any).toString(), echoInventoryId: { $exists: false } }).lean();
          await echoMTGService.addBatch(newCards);
        } catch (err) {
          logger.error('Post-import Echo batch sync failed', { jobId, err });
        }
      });
    }

    emitProgress(jobId, { type: 'complete', processed: parsed.length, total: parsed.length, inserted, updated, skipped });

    logger.info('Import complete', { jobId, source: importer.sourceName, inserted, updated, skipped, durationMs });
    return { jobId, inserted, updated, skipped, errorCount: importErrors.length, durationMs };
  }
}

export const collectionImportService = new CollectionImportService();
