import { EchoCondition, EchoLanguage, CollectionStatus } from '../../models/CollectionCard';

export interface ParsedCard {
  name: string;
  setCode: string;
  collectorNumber?: string;
  isFoil: boolean;
  condition: EchoCondition;
  quantity: number;
  language: EchoLanguage;
  status: CollectionStatus;
  acquisitionPrice?: number;
  acquisitionDate?: Date;
  source: string;
  scryfallId?: string;
  emid?: number;
  notes?: string;
}

export interface ICollectionImporter {
  readonly sourceName: string;
  canHandle(headers: string[]): boolean;
  parse(rows: Record<string, string>[]): ParsedCard[];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const CONDITION_MAP: Record<string, EchoCondition> = {
  'near mint': 'NM', 'nm': 'NM', 'mint': 'NM', 'nmt': 'NM',
  'lightly played': 'LP', 'lp': 'LP', 'excellent': 'LP', 'slightly played': 'LP',
  'moderately played': 'MP', 'mp': 'MP', 'good': 'LP', 'played': 'MP',
  'heavily played': 'HP', 'hp': 'HP', 'poor': 'HP',
  'damaged': 'D', 'dmg': 'D', 'd': 'D',
  'altered': 'ALT', 'alt': 'ALT',
};

export const LANGUAGE_MAP: Record<string, EchoLanguage> = {
  'english': 'EN', 'en': 'EN',
  'german': 'DE', 'de': 'DE',
  'french': 'FR', 'fr': 'FR',
  'russian': 'RU', 'ru': 'RU',
  'italian': 'IT', 'it': 'IT',
  'spanish': 'ES', 'es': 'ES',
  'portuguese': 'PT', 'pt': 'PT',
  'chinese traditional': 'CT', 'ct': 'CT',
  'chinese simplified': 'CS', 'cs': 'CS',
  'japanese': 'JP', 'jp': 'JP',
  'korean': 'KR', 'kr': 'KR',
};

export function toCondition(raw: string | undefined): EchoCondition {
  if (!raw) return 'NM';
  return CONDITION_MAP[raw.trim().toLowerCase()] ?? (raw.trim().toUpperCase() as EchoCondition) ?? 'NM';
}

export function toLanguage(raw: string | undefined): EchoLanguage {
  if (!raw) return 'EN';
  return LANGUAGE_MAP[raw.trim().toLowerCase()] ?? (raw.trim().toUpperCase() as EchoLanguage) ?? 'EN';
}

export function toFoil(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'foil' || v === 'etched';
}

export function toQty(raw: string | undefined): number {
  const n = parseInt(raw ?? '1', 10);
  return isNaN(n) || n < 1 ? 1 : n;
}

export function toPrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseFloat(raw.replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? undefined : n;
}

export function hasAll(headers: string[], required: string[]): boolean {
  const lower = headers.map(h => h.toLowerCase());
  return required.every(r => lower.includes(r.toLowerCase()));
}
