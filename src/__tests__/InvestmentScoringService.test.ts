import { InvestmentScoringService } from '../services/InvestmentScoringService';

// Minimal mock of ICard for scoring tests
function makeCard(overrides: Record<string, any> = {}): any {
  return {
    _id: 'test-id',
    scryfallId: 'abc',
    name: 'Test Card',
    rarity: 'rare',
    priceHistory: [],
    edhrec: undefined,
    ...overrides
  };
}

describe('InvestmentScoringService', () => {
  const svc = new InvestmentScoringService();

  it('returns 0 score for a card with no data', () => {
    const { score, signals } = svc.score(makeCard());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(signals).toBeInstanceOf(Array);
  });

  it('adds is_commander signal for commander with rank', () => {
    const card = makeCard({ edhrec: { commanderRank: 100, totalDecks: 5000, combos: [] } });
    const { signals } = svc.score(card);
    expect(signals).toContain('is_commander');
  });

  it('adds has_combos signal when combos exist', () => {
    const card = makeCard({ edhrec: { combos: [{ a: 1 }, { b: 2 }] } });
    const { signals } = svc.score(card);
    expect(signals).toContain('has_combos');
  });

  it('adds mythic signal for mythic rarity', () => {
    const card = makeCard({ rarity: 'mythic' });
    const { signals } = svc.score(card);
    expect(signals).toContain('mythic');
  });

  it('adds price_rising signal when price increased > 20%', () => {
    const card = makeCard({
      priceHistory: [
        { date: new Date('2024-01-01'), market: 10, source: 'tcgplayer' },
        { date: new Date('2024-06-01'), market: 14, source: 'tcgplayer' }
      ]
    });
    const { signals } = svc.score(card);
    expect(signals).toContain('price_rising');
  });

  it('score is always a non-negative number', () => {
    const cards = [
      makeCard(),
      makeCard({ rarity: 'mythic', edhrec: { commanderRank: 1, totalDecks: 50000 } }),
      makeCard({ rarity: 'common' })
    ];
    for (const card of cards) {
      expect(svc.score(card).score).toBeGreaterThanOrEqual(0);
    }
  });
});
