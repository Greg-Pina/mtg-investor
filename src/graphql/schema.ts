import { buildSchema } from 'graphql';

export const schema = buildSchema(`
  scalar JSON

  type FinancialSnapshot {
    usd: Float
    usdFoil: Float
    eur: Float
    tix: Float
    market: Float
    low: Float
    mid: Float
    high: Float
    capturedAt: String!
  }

  type Card {
    id: ID!
    scryfallId: String!
    name: String!
    setCode: String
    setName: String
    collectorNumber: String
    typeLine: String
    oracleText: String
    colors: [String!]
    rarity: String
    imageUris: JSON
    prices: JSON
    financialSnapshot: FinancialSnapshot!
    lastUpdated: String!
  }

  type CardRelationshipCluster {
    key: String!
    label: String!
    cardCount: Int!
    cards: [Card!]!
  }

  type CardConnection {
    cards: [Card!]!
    total: Int!
    page: Int!
    limit: Int!
  }

  input CardFilterInput {
    q: String
    setCode: String
    rarity: String
    page: Int
    limit: Int
  }

  type SyncResult {
    saved: Int!
  }

  type EnrichResult {
    success: Boolean!
  }

  type Query {
    cards(filter: CardFilterInput): CardConnection!
    card(name: String!): Card
    clusters(limitPerCluster: Int): [CardRelationshipCluster!]!
  }

  type Mutation {
    syncScryfall(limit: Int): SyncResult!
    enrichCard(name: String!): EnrichResult!
  }
`);
