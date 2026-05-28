import { CardModel, ICard } from '../models';

interface ScoreResult {
  score: number;
  signals: string[];
}

export class InvestmentScoringService {
  private static readonly WEIGHTS = {
    commanderRank: -0.3,  // lower rank = more popular
    totalDecks: 0.25,
    comboCount: 0.2,
    synergyRecs: 0.1,
    priceVolatility: -0.05,
    recentPriceChange: 0.1,
  };

  score(card: ICard): ScoreResult {
    let score = 0;
    const signals: string[] = [];

    const edhrec = card.edhrec;
    if (edhrec) {
      if (edhrec.commanderRank != null && edhrec.commanderRank > 0) {
        // Invert rank: rank 1 = most popular, normalize to 0-1 range assuming max rank ~10000
        const rankScore = Math.max(0, 1 - edhrec.commanderRank / 10000);
        score += rankScore * Math.abs(InvestmentScoringService.WEIGHTS.commanderRank) * 100;
        signals.push('is_commander');
      }

      if (edhrec.totalDecks != null && edhrec.totalDecks > 0) {
        // Normalize: 10000+ decks = high signal, cap at 100 points
        const deckScore = Math.min(1, edhrec.totalDecks / 10000);
        score += deckScore * InvestmentScoringService.WEIGHTS.totalDecks * 100;
        if (edhrec.totalDecks > 1000) signals.push('high_deck_count');
      }

      if (edhrec.combos && edhrec.combos.length > 0) {
        const comboScore = Math.min(1, edhrec.combos.length / 10);
        score += comboScore * InvestmentScoringService.WEIGHTS.comboCount * 100;
        signals.push('has_combos');
      }

      if (edhrec.recommendations) {
        const recCount = Object.values(edhrec.recommendations).reduce(
          (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
          0
        );
        const synergyScore = Math.min(1, recCount / 50);
        score += synergyScore * InvestmentScoringService.WEIGHTS.synergyRecs * 100;
        if (recCount > 10) signals.push('high_synergy');
      }
    }

    // Price volatility and trend from priceHistory
    if (card.priceHistory && card.priceHistory.length >= 2) {
      const sorted = [...card.priceHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
      const markets = sorted.map((p) => p.market).filter((v): v is number => v != null);

      if (markets.length >= 2) {
        const oldest = markets[0];
        const newest = markets[markets.length - 1];

        if (oldest > 0) {
          const changePct = (newest - oldest) / oldest;
          score += changePct * InvestmentScoringService.WEIGHTS.recentPriceChange * 100;
          if (changePct > 0.2) signals.push('price_rising');
          if (changePct < -0.2) signals.push('price_falling');
        }

        // Volatility = coefficient of variation
        const mean = markets.reduce((s, v) => s + v, 0) / markets.length;
        if (mean > 0) {
          const variance = markets.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / markets.length;
          const cv = Math.sqrt(variance) / mean;
          score += cv * InvestmentScoringService.WEIGHTS.priceVolatility * 100;
          if (cv > 0.5) signals.push('high_volatility');
        }
      }
    }

    // Rarity bonus
    if (card.rarity === 'mythic') {
      score += 5;
      signals.push('mythic');
    } else if (card.rarity === 'rare') {
      score += 2;
    }

    return { score: Math.max(0, Math.round(score * 10) / 10), signals };
  }

  async updateAllScores(): Promise<void> {
    const cursor = CardModel.find({}).cursor();
    let updated = 0;

    for await (const card of cursor) {
      const { score, signals } = this.score(card);
      await CardModel.updateOne(
        { _id: card._id },
        { $set: { investmentScore: score, investmentSignals: signals } }
      );
      updated++;
    }

    console.log(`[InvestmentScoringService] Updated scores for ${updated} cards.`);
  }
}
