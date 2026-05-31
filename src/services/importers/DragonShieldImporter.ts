import { ICollectionImporter, ParsedCard, hasAll, toCondition, toFoil, toLanguage, toQty } from './ICollectionImporter';

export class DragonShieldImporter implements ICollectionImporter {
  readonly sourceName = 'dragonshield';

  canHandle(headers: string[]): boolean {
    // DragonShield exports use "Card Name" and "Folder Name" or "Finish"
    return hasAll(headers, ['Card Name']) &&
      headers.some(h => h.toLowerCase() === 'folder name' || h.toLowerCase() === 'finish');
  }

  parse(rows: Record<string, string>[]): ParsedCard[] {
    return rows.map(row => {
      const finish = row['Finish'] ?? row['finish'] ?? '';
      return {
        name: row['Card Name'] ?? row['card name'] ?? '',
        setCode: (row['Set Code'] ?? row['Set code'] ?? row['set code'] ?? row['Expansion'] ?? '').toUpperCase(),
        collectorNumber: row['Card Number'] ?? row['card number'] ?? undefined,
        isFoil: toFoil(finish),
        condition: toCondition(row['Condition'] ?? row['condition']),
        quantity: toQty(row['Quantity'] ?? row['quantity'] ?? row['Trade Quantity']),
        language: toLanguage(row['Language'] ?? row['language']),
        status: 'In Collection' as const,
        source: 'dragonshield',
        notes: row['Notes'] ?? undefined,
      };
    }).filter(c => c.name && c.setCode);
  }
}
