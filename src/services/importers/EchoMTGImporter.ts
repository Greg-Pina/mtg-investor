import { ICollectionImporter, ParsedCard, hasAll, toCondition, toFoil, toLanguage, toQty } from './ICollectionImporter';

export class EchoMTGImporter implements ICollectionImporter {
  readonly sourceName = 'echomtg';

  canHandle(headers: string[]): boolean {
    return headers.some(h => h.toLowerCase() === 'echo_id' || h.toLowerCase() === 'echoid' || h.toLowerCase() === 'emid');
  }

  parse(rows: Record<string, string>[]): ParsedCard[] {
    return rows.map(row => {
      const emidRaw = row['echo_id'] ?? row['echoid'] ?? row['emid'] ?? row['EMID'];
      const emid = emidRaw ? parseInt(emidRaw, 10) : undefined;
      return {
        name: row['card_name'] ?? row['name'] ?? row['Name'] ?? '',
        setCode: (row['set_code'] ?? row['set'] ?? row['Set'] ?? '').toUpperCase(),
        emid: emid && !isNaN(emid) ? emid : undefined,
        isFoil: toFoil(row['foil'] ?? row['Foil']),
        condition: toCondition(row['condition'] ?? row['Condition']),
        quantity: toQty(row['quantity'] ?? row['qty'] ?? row['Quantity']),
        language: toLanguage(row['language'] ?? row['Language']),
        status: 'In Collection' as const,
        source: 'echomtg',
      };
    }).filter(c => c.name && c.setCode);
  }
}
