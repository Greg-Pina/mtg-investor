import { ICollectionImporter, ParsedCard, hasAll, toCondition, toFoil, toLanguage, toPrice, toQty } from './ICollectionImporter';

export class ManaBoxImporter implements ICollectionImporter {
  readonly sourceName = 'manabox';

  canHandle(headers: string[]): boolean {
    // ManaBox exports have these distinctive headers
    return hasAll(headers, ['Name', 'Set code']) &&
      headers.some(h => h.toLowerCase() === 'scryfall id' || h.toLowerCase() === 'purchase price');
  }

  parse(rows: Record<string, string>[]): ParsedCard[] {
    return rows.map(row => {
      const isFoil = toFoil(row['Foil'] ?? row['foil']);
      return {
        name: row['Name'] ?? row['name'] ?? '',
        setCode: (row['Set code'] ?? row['set code'] ?? row['setCode'] ?? '').toUpperCase(),
        collectorNumber: row['Collector number'] ?? row['collector number'] ?? undefined,
        scryfallId: row['Scryfall ID'] ?? row['scryfall id'] ?? undefined,
        isFoil,
        condition: toCondition(row['Condition'] ?? row['condition']),
        quantity: toQty(row['Quantity'] ?? row['quantity']),
        language: toLanguage(row['Language'] ?? row['language']),
        status: 'In Collection' as const,
        acquisitionPrice: toPrice(row['Purchase price'] ?? row['purchase price']),
        source: 'manabox',
      };
    }).filter(c => c.name && c.setCode);
  }
}
