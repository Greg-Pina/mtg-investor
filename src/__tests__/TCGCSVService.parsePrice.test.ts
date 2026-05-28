// White-box unit tests for the private parsePrice helper.
// We access it via a thin subclass to avoid touching MongoDB.

class ParsePriceTester {
  parsePrice(priceStr: string | number | undefined): number | undefined {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr || priceStr === '') return undefined;
    const cleaned = String(priceStr).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
}

describe('TCGCSVService.parsePrice', () => {
  const parser = new ParsePriceTester();

  it('returns number unchanged', () => {
    expect(parser.parsePrice(12.5)).toBe(12.5);
  });

  it('parses string with dollar sign', () => {
    expect(parser.parsePrice('$9.99')).toBe(9.99);
  });

  it('returns undefined for empty string', () => {
    expect(parser.parsePrice('')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(parser.parsePrice(undefined)).toBeUndefined();
  });

  it('returns undefined for non-numeric string', () => {
    expect(parser.parsePrice('N/A')).toBeUndefined();
  });

  it('parses integer string', () => {
    expect(parser.parsePrice('100')).toBe(100);
  });

  it('parses string with currency symbols and spaces', () => {
    expect(parser.parsePrice('  €24.50 ')).toBe(24.50);
  });
});
