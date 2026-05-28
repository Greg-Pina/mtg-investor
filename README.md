# MTG Investor

A TypeScript/Express API for tracking, scoring, and alerting on Magic: The Gathering card investment opportunities. Pulls card data from Scryfall and price data from TCGPlayer, ManaPool, and TOA Magic — then applies a weighted investment scoring model against EDHREC demand signals.

## Features

- **Investment Scoring** — weighted model across EDHREC inclusion rates, price trend signals, and set data
- **Multi-provider Pricing** — TCGPlayer, ManaPool, and TOA Magic with lazy init and graceful fallback
- **Scryfall Integration** — live search + bulk ingest with rate limiting (10 req/s)
- **GraphQL API** — typed schema with card search, filtering, clustering, and financial snapshots
- **Watchlist** — per-user watchlists with target prices and daily alert checks
- **JWT Auth** — register/login/refresh token flow with bcrypt password hashing
- **Redis Cache** — optional ioredis-backed cache; gracefully disabled if `REDIS_URL` is absent
- **Swagger Docs** — OpenAPI spec served at `/api/docs`
- **Azure Functions** — serverless functions for card enrichment, investment scoring, Scryfall ingest, and alert checks
- **Winston Logging** — structured logs with configurable level

## Project Structure

```
src/
├── __tests__/           # Jest test suites
├── config/              # Env validation, Swagger setup
├── controllers/         # Route handlers
├── graphql/             # Schema, resolvers, types, normalization
├── middleware/          # JWT auth, rate limiting, JSON parsing
├── models/              # Mongoose models (Card, User, Watchlist, Alert)
├── routes/              # Express routers
├── services/
│   ├── providers/       # TCGPlayer, ManaPool, TOA Magic HTTP clients
│   ├── AlertService.ts
│   ├── CacheService.ts
│   ├── CardDataPipelineService.ts
│   ├── EDHRECService.ts
│   ├── InvestmentScoringService.ts
│   ├── ScryfallService.ts
│   └── TCGCSVService.ts
└── utils/               # Winston logger

azure-functions/
└── src/functions/       # alertCheck, enrichCard, investmentScoring, scryfallIngest

infra/
└── main.bicep           # Azure infrastructure as code
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional — caching disabled if not set)

## Installation

```bash
npm install
```

Copy the example env file and fill in your values:

```bash
cp configs/.env.example configs/.env
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `development` / `production` |
| `LOG_LEVEL` | No | `info`, `debug`, `warn`, `error` |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | Secret for refresh tokens |
| `REDIS_URL` | No | Redis connection string — caching disabled if absent |
| `TCGPLAYER_API_KEY` | No | Falls back to CSV ingest |
| `MANAPOOL_AUTH_TOKEN` | No | Optional price provider |
| `TOA_MAGIC_API_KEY` | No | Optional price provider |
| `SENDGRID_API_KEY` | No | Required for email price alerts |
| `ALERT_FROM_EMAIL` | No | Sender address for alerts |
| `SCHEDULE_INGEST` | No | Set `true` to enable cron-based Scryfall ingest |

## Running

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

Start MongoDB locally with Docker if needed:

```bash
docker run -d -p 27017:27017 --name mongo mongo:latest
```

## REST API

### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Create account — body: `{ email, password }` |
| `POST` | `/login` | Get access + refresh tokens |
| `POST` | `/refresh` | Exchange refresh token for new access token |

Protected routes require `Authorization: Bearer <token>`.

### Scryfall — `/api/scryfall`

| Method | Path | Description |
|---|---|---|
| `GET` | `/search?q=&page=` | Live Scryfall query (rate limited at 10 req/s) |
| `POST` | `/ingest` | Bulk ingest — body: `{ q, pages? }` — saves to MongoDB |
| `GET` | `/cards?q=&setCode=&rarity=&page=&limit=` | Query saved cards |

### Watchlist — `/api/watchlist` *(auth required)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Get your watchlist |
| `POST` | `/` | Add card — body: `{ cardName, targetPrice? }` |
| `DELETE` | `/:id` | Remove entry |

### MTG Cards — `/api/mtg`

| Method | Path | Description |
|---|---|---|
| `POST` | `/process` | Enrich card data from EDHREC |
| `GET` | `/card/:name` | Get card by name |
| `GET` | `/search?q=&isCommander=&hasCombos=` | Search cards |
| `GET` | `/investment` | Cards ranked by investment score |
| `DELETE` | `/card/:name` | Delete card |

### Enrichment — `/api/enrich`

| Method | Path | Description |
|---|---|---|
| `POST` | `/edhrec` | Enrich cards with EDHREC inclusion data |
| `POST` | `/financials` | Pull price data from configured providers |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/docs` | Swagger/OpenAPI UI |

## GraphQL API

Available at `POST /api/graphql`.

```graphql
# Search and filter cards
query {
  cards(filter: { q: "sol ring", setCode: "cmm", rarity: "rare", page: 1, limit: 20 }) {
    cards {
      name
      setCode
      rarity
      investmentScore
      financialSnapshot {
        usd
        usdFoil
        priceChange30d
      }
    }
    total
    page
    limit
  }
}

# Get a single card with full details
query {
  card(name: "Sol Ring") {
    name
    investmentScore
    investmentSignals
    financialSnapshot { usd usdFoil priceChange30d }
  }
}

# Group cards by set
query {
  clusters(limitPerCluster: 5) {
    key
    label
    cardCount
    cards { name investmentScore }
  }
}
```

## Investment Scoring

`InvestmentScoringService` produces a 0–100 score using weighted signals:

| Signal | Weight |
|---|---|
| EDHREC inclusion rate | 40% |
| 30-day price trend | 30% |
| Price stability | 20% |
| Set demand multiplier | 10% |

Cards above a threshold are flagged with `investmentSignals` — an array of human-readable reasons (`"High EDHREC inclusion"`, `"Strong upward price trend"`, etc.).

## Testing

```bash
npm test              # Run all tests
npm run test:coverage # With coverage report
```

Test suites cover `InvestmentScoringService` (scoring logic) and `TCGCSVService.parsePrice` (CSV parsing edge cases).

## Azure Deployment

The `azure-functions/` directory contains four timer-triggered functions:

| Function | Schedule | Description |
|---|---|---|
| `scryfallIngest` | Daily | Bulk-ingest Scryfall card catalog |
| `enrichCard` | Daily | EDHREC enrichment for tracked cards |
| `investmentScoring` | Daily | Recompute investment scores |
| `alertCheck` | Daily | Check watchlist target prices and send alerts |

Infrastructure is defined in `infra/main.bicep` (Azure Functions, Storage, Cosmos-compatible MongoDB). Deploy with the [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/):

```bash
azd up
```

## License

ISC
