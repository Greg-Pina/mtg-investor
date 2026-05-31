import { ICollectionImporter, ParsedCard, toCondition, toFoil, toLanguage, toQty } from './ICollectionImporter';

// Fallback importer: handles any CSV that has a card name + set code under common aliases
export class GenericImporter implements ICollectionImporter {
  readonly sourceName = 'generic';

  canHandle(_headers: string[]): boolean {
    return true; // always a match — must be last in the chain
  }

  private findField(row: Record<string, string>, ...keys: string[]): string | undefined {
    for (const key of keys) {
      const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
      if (found && row[found]) return row[found];
    }
    return undefined;
  }

  parse(rows: Record<string, string>[]): ParsedCard[] {
    const results: ParsedCard[] = [];
    for (const row of rows) {
      const name = this.findField(row, 'name', 'card', 'card_name', 'cardname', 'card name', 'title');
      const setCode = this.findField(row, 'set_code', 'set code', 'setcode', 'set', 'expansion_code', 'expansion');
      if (!name || !setCode) continue;

      results.push({
        name,
        setCode: setCode.toUpperCase(),
        collectorNumber: this.findField(row, 'collector_number', 'collector number', 'number', 'no'),
        isFoil: toFoil(this.findField(row, 'foil', 'finish', 'printing', 'is_foil')),
        condition: toCondition(this.findField(row, 'condition', 'grade', 'quality')),
        quantity: toQty(this.findField(row, 'quantity', 'qty', 'count', 'amount')),
        language: toLanguage(this.findField(row, 'language', 'lang')),
        status: 'In Collection' as const,
        source: 'import',
      });
    }
    return results;
  }
}
