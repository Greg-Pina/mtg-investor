# Moronic MTG

A hybrid MTG collection middleware hub and investment dashboard. Bridges local scanning workflows (ManaBox, DragonShield, TCGPlayer) with EchoMTG as the cloud inventory backend, while layering Scryfall and EDHREC investment intelligence on top.

## What it does

- **Single source of truth** — import cards from any CSV source into one unified MongoDB collection
- **EchoMTG sync** — bidirectional: pull your cloud inventory locally, push new cards back to EchoMTG
- **Investment scoring** — all Scryfall cards scored; owned cards surfaced with priority
- **Public storefront** — share listed cards with direct buy links to TCGPlayer and ManaPool
- **Admin dashboard** — manage your full collection with inline editing and import tools

---

## Architecture

MongoDB uses a bronze/silver/gold data model — all in one database, one connection:

```
Bronze (raw ingest)
├── import_jobs        ← import session metadata and error logs
└── (import_rows_raw)  ← raw rows retained for 30-day audit window (TTL index)

Silver (normalized collection)
└── collection_cards   ← unified personal inventory, deduplicated

Gold (enriched & scored)
├── cards              ← Scryfall data, EDHREC signals, investment scores
├── watchlists         ← session-based price watchlists
└── alerts             ← price threshold alerts
```

## Project Structure

```
src/
├── __tests__/           # Jest test suites
├── config/              # Env validation, Swagger setup
├── controllers/
│   ├── collectionController.ts   # Collection CRUD, import, portfolio, store
│   └── enrichmentController.ts  # TCG + EDHREC enrichment
├── middleware/          # JWT auth, rate limiting
├── models/
│   ├── Card.ts                   # Gold layer: Scryfall/EDHREC/investment data
│   ├── CollectionCard.ts         # Silver layer: personal collection inventory
│   └── ImportJob.ts              # Bronze layer: import session tracking
├── routes/
│   └── collection.ts             # All collection + import + store endpoints
├── services/
│   ├── importers/                # Source-agnostic CSV import pipeline
│   │   ├── ICollectionImporter.ts
│   │   ├── ManaBoxImporter.ts
│   │   ├── DragonShieldImporter.ts
│   │   ├── TCGPlayerCollectionImporter.ts
│   │   ├── EchoMTGImporter.ts
│   │   └── GenericImporter.ts    # Fallback: fuzzy header matching
│   ├── providers/                # TCGPlayer, ManaPool, TOA Magic HTTP clients
│   ├── CollectionImportService.ts  # Preview + streaming commit + SSE progress
│   ├── EchoMTGService.ts           # Full EchoMTG API client
│   ├── EDHRECService.ts            # JSON fast-path (json.edhrec.com)
│   ├── InvestmentScoringService.ts
│   └── ScryfallService.ts
├── types/
│   └── cards.ts                  # Shared interfaces: CardFilterInput, FinancialSnapshot, …
└── utils/
    ├── financial.ts              # normalizeFinancialSnapshot helper
    ├── logger.ts
    └── marketplaceLinks.ts       # TCGPlayer + ManaPool URL builder

public/
├── index.html    # Main dashboard (5 tabs)
├── store.html    # Public storefront
└── admin.html    # Admin panel

python/
└── advanced_processor.py   # Optional: deep EDHREC enrichment via pyedhrec (fallback path)
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional — caching disabled if not set)
- Python 3 + `pip install pyedhrec` (optional — for deep EDHREC batch enrichment)

## Installation

```bash
npm install
```

Copy and configure the environment file:

```bash
cp configs/.env.example configs/.env
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for access tokens |
| `JWT_REFRESH_SECRET` | **Yes** | Secret for refresh tokens |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `development` / `production` |
| `LOG_LEVEL` | No | `info`, `debug`, `warn`, `error` |
| `REDIS_URL` | No | Redis connection string — caching disabled if absent |
| `ECHO_MTG_TOKEN` | No | Static EchoMTG bearer token (takes priority over email/password) |
| `ECHO_MTG_EMAIL` | No | EchoMTG email — used for auto token refresh |
| `ECHO_MTG_PASSWORD` | No | EchoMTG password — used with email for auto token refresh |
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

## Pages

| URL | Description |
|---|---|
| `http://localhost:3000/` | Investment dashboard (5 tabs) |
| `http://localhost:3000/store` | Public storefront — listed cards with marketplace buy links |
| `http://localhost:3000/admin` | Admin panel — full collection management and import tools |

## Collection API

### Collection — `/api/collection`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List collection cards. Filter: `status`, `source`, `condition`, `isFoil`, `q`, `page`, `limit` |
| `POST` | `/` | Manually add a card. Fires EchoMTG add if `emid` present |
| `PATCH` | `/:id` | Update card (qty, status, condition, notes). Fires EchoMTG update. Setting `status: "Sold"` + `soldPrice` logs to EchoMTG earnings |
| `DELETE` | `/:id` | Remove card. Fires EchoMTG delete |
| `POST` | `/import/preview` | Dry-run CSV parse — returns source detection + counts, no writes |
| `POST` | `/import` | Commit CSV import. Returns `jobId`. Bulk-syncs new cards to EchoMTG |
| `GET` | `/import/progress/:jobId` | SSE stream of live import progress |
| `GET` | `/import/history` | Last 10 import job records |
| `POST` | `/sync/echo` | Pull full EchoMTG inventory → upsert locally (runs in background) |
| `GET` | `/portfolio` | Aggregate value, investment signals for owned cards, top unowned opportunities |

### Store — `/api/store`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Cards where `status == "Listed for Sale"` with TCGPlayer + ManaPool URLs injected |

## CSV Import

The import pipeline auto-detects the source from CSV headers. Supported formats:

| Source | Distinctive headers |
|---|---|
| ManaBox | `Scryfall ID`, `Set code`, `Purchase price` |
| DragonShield | `Card Name`, `Finish`, `Folder Name` |
| TCGPlayer (collection) | `Printing`, `Set Name`, `Number` |
| EchoMTG CSV | `echo_id` / `echoid` / `emid` |
| Generic (fallback) | Any CSV with `name`/`card`/`card_name` + `set`/`set_code` |

**Import flow:**
1. `POST /api/collection/import/preview` — parse only, returns row counts and a 10-row sample
2. `POST /api/collection/import` — commit; streams progress via SSE; fires EchoMTG bulk sync after completion
3. Duplicate cards have their quantities summed by default (configurable via `mergeStrategy: "replace"`)

**Marketplace URL format:**
- TCGPlayer: `https://www.tcgplayer.com/search?productLineName=magic&q={Name+SetCode}&view=grid`
- ManaPool: `https://manapool.com/search?q={Name+#set:setcode}`

## EchoMTG Integration

EchoMTG is used as the cloud inventory backend. The local MongoDB collection is always authoritative; Echo is synced async and failures are logged without blocking.

**Authentication:** Set `ECHO_MTG_TOKEN` for a static token, or `ECHO_MTG_EMAIL` + `ECHO_MTG_PASSWORD` for auto-refresh (24-hour token expiry). Echo integration degrades gracefully if credentials are absent.

**Condition codes** — the full EchoMTG set is supported including graded cards:

| Category | Codes |
|---|---|
| Standard | `NM`, `LP`, `MP`, `HP`, `D`, `ALT`, `ART`, `PRE`, `TS`, `SGN` |
| BGS | `BGS`, `B10`, `B95` … `B7` |
| PSA | `PSA`, `P10`, `P95` … `P7` |
| CGC | `CGC`, `C10P`, `C10`, `C95` … `C7` |
| PCG | `PCG`, `PC10`, `PC95` … `PC7` |

## Investment Scoring

`InvestmentScoringService` produces a 0–100 score using weighted signals:

| Signal | Weight |
|---|---|
| EDHREC inclusion rate | 40% |
| 30-day price trend | 30% |
| Price stability | 20% |
| Set demand multiplier | 10% |

The `/api/collection/portfolio` endpoint cross-references your collection against all scored cards, annotating owned cards with `investmentScore`, `currentValue`, and `unrealizedGain`, while also returning the top 10 unowned high-score cards as `topOpportunities`.

## EDHREC Enrichment

Two paths:

- **Fast path** (`EDHRECService`) — direct HTTP to `https://json.edhrec.com/pages`. Used for all real-time enrichment via `POST /api/enrich/edhrec`. Undocumented endpoint; may be subject to rate limits.
- **Fallback path** (`python/advanced_processor.py`) — uses `pyedhrec` library. Invoked as a Python subprocess if `EDHRECService` fails. Requires Python 3 and `pip install pyedhrec`; degrades gracefully if unavailable.

## Existing REST API

### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/register` | Create account — body: `{ email, password }` |
| `POST` | `/login` | Get access + refresh tokens |
| `POST` | `/refresh` | Exchange refresh token for new access token |

### Scryfall — `/api/scryfall`

| Method | Path | Description |
|---|---|---|
| `GET` | `/search?q=&page=` | Live Scryfall query |
| `POST` | `/ingest` | Bulk ingest — body: `{ q, pages? }` — saves to MongoDB |
| `GET` | `/cards?q=&setCode=&rarity=&page=&limit=` | Query saved cards |

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
| `POST` | `/edhrec` | Enrich cards with EDHREC data — body: `{ names: string[] }` |
| `POST` | `/financials` | Pull price data from configured providers |

### Watchlist — `/api/watchlist` *(auth required)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Get your watchlist |
| `POST` | `/` | Add card — body: `{ cardName, targetPrice? }` |
| `DELETE` | `/:id` | Remove entry |

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/docs` | Swagger/OpenAPI UI |

## Testing

```bash
npm test
npm run test:coverage
```

## Background Scheduling

When `SCHEDULE_INGEST=true`, three cron jobs run inside the server process:

| Time (UTC) | Job | What it does |
|---|---|---|
| 02:00 daily | Scryfall ingest | Fetches up to 2,000 cards from Scryfall, upserts into `cards` collection |
| 03:00 daily | Investment scoring | Recalculates `investmentScore` + `investmentSignals` for all cards |
| 03:30 daily | Alert check | Evaluates pending price alerts and marks triggered ones |

Set `SCHEDULE_INGEST=false` (or omit it) when running multiple instances to avoid duplicate job execution.

## Docker

```bash
docker build -t mtg-investor .
docker run -p 3000:3000 -e MONGODB_URI=<uri> mtg-investor
```

## Changelog

### v2 (2026-05)

**Removed:**
- `azure-functions/` — `alertCheck`, `enrichCard`, `investmentScoring`, `scryfallIngest` were serverless duplicates of the in-process `node-cron` jobs; no CI/CD pipeline was ever wired to deploy them
- `infra/main.bicep` + `azure.yaml` — Azure Storage Queue and Function App infrastructure no longer needed
- `src/graphql/` and `/api/graphql` endpoint — thin wrapper over the same services the REST routes call; dropped `graphql` and `graphql-http` packages
- `@azure/functions` and `@azure/storage-queue` packages
- `QueueService` — enrichment is now synchronous (EDHRECService → Python fallback)
- Unused `MTGCardModel` (`mtgcards` collection) — abandoned scaffolding replaced by `CardModel`

**Fixed:**
- `CardDataPipelineService.enrichCard()` previously mocked Express `req`/`res` to invoke `EnrichmentController`; now calls `EDHRECService` directly
- `mtgController` migrated from dead `MTGCardModel` to `CardModel` with correct field names (`name`, `investmentSignals`, `edhrec.*`)

**Relocated:**
- `FinancialSnapshot`, `CardFilterInput`, `CardRelationshipCluster` → `src/types/cards.ts`
- `normalizeFinancialSnapshot()` → `src/utils/financial.ts`

## License

ISC
