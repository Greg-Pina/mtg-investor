import { ICollectionImporter, ParsedCard, hasAll, toCondition, toFoil, toLanguage, toQty } from './ICollectionImporter';

export class TCGPlayerCollectionImporter implements ICollectionImporter {
  readonly sourceName = 'tcgplayer';

  canHandle(headers: string[]): boolean {
    // TCGPlayer collection export has "Printing" and "Set Name" / "Number"
    return hasAll(headers, ['Quantity', 'Name']) &&
      headers.some(h => h.toLowerCase() === 'printing' || h.toLowerCase() === 'set name');
  }

  parse(rows: Record<string, string>[]): ParsedCard[] {
    return rows.map(row => {
      const printing = row['Printing'] ?? row['printing'] ?? '';
      return {
        name: row['Name'] ?? row['name'] ?? '',
        // TCGPlayer uses "Set Name" not a 3-letter code; store as-is and normalize later
        setCode: (row['Set Code'] ?? row['Set code'] ?? row['Set'] ?? row['set'] ?? '').toUpperCase(),
        collectorNumber: row['Number'] ?? row['number'] ?? undefined,
        isFoil: toFoil(printing),
        condition: toCondition(row['Condition'] ?? row['condition']),
        quantity: toQty(row['Quantity'] ?? row['quantity']),
        language: toLanguage(row['Language'] ?? row['language']),
        status: 'In Collection' as const,
        source: 'tcgplayer',
      };
    }).filter(c => c.name && c.setCode);
  }
}
