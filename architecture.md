# Architecture — Stock Portfolio App

## System Overview

```
Browser (Angular SPA)
    │
    ├── /api/* (proxy)
    │       │
    │       └── castle.local (Spring Boot backend)
    │               ├── Kite/Zerodha API (trade sync)
    │               └── PostgreSQL (persistence)
    │
    └── IndexedDB (Dexie) — local comment/thesis notes
```

## Frontend Architecture

### Component Hierarchy

```
AppComponent (root)
└── MainLayoutComponent (shell)
    ├── AddStockModalComponent (global modal)
    └── <router-outlet>
         ├── SwingTradeGroupsComponent
         ├── TradesToGroupComponent
         ├── ClosedSwingReportComponent
         ├── HoldingsListComponent
         ├── CorePortfolioComponent
         ├── ReturnsComponent
         │   └── ReturnsChartComponent
         ├── WatchlistDeviationComponent
         └── DashboardTabsComponent
```

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│               Components (UI)                │
│  Signals + computed() for local state        │
│  Template: @if / @for (new control flow)     │
└──────────────────┬──────────────────────────┘
                   │ inject()
┌──────────────────▼──────────────────────────┐
│               Services (Data)                │
│  HttpClient → Observable<T>                  │
│  BehaviorSubject for shared streams          │
│  providedIn: 'root' (singletons)            │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            Models (Types)                    │
│  Pure TypeScript interfaces / types          │
│  One file per domain entity                  │
└─────────────────────────────────────────────┘
```

## State Management

### Pattern: Component-Local Signals

Each component owns its state as `signal()` / `computed()`. No global store.

```typescript
// Example — SwingTradeGroupsComponent
readonly status   = signal<SwingStatusFilter>('OPEN');
readonly sortKey  = signal<SwingSortKey>('updatedAt');
readonly allRows  = signal<SwingGroupPosition[]>([]);

readonly viewRows = computed(() => {
  // filter + sort allRows based on status, sortKey, sortDir, symbolFilter
});
readonly summary  = computed(() => /* aggregate PnL across viewRows */);
```

### Shared State (BehaviorSubject)

- `PortfolioService.holdings$` — shared holdings stream
- `CommentsService` — multiple BehaviorSubjects for comment CRUD state
- `KiteAuthService._loggedIn` — auth state as Signal

### Local Persistence (Dexie / IndexedDB)

`CommentsService` → `comments-db.ts` (Dexie schema)

```
Table: comments
  - symbol (indexed)
  - text, createdAt, type (THESIS | NOTE)
  - duration, stopLoss, watch
```

### Data Flow Diagram

```
ngOnInit
  └── service.getX().subscribe(data => signal.set(data))
        │
        └── signal() update → computed() auto-recalculates → template re-renders
```

## Service Inventory

| Service | API Domain | Pattern |
|---------|-----------|---------|
| `SwingTradeService` | `/api/swing/*` | Observable<T> |
| `HoldingsService` | `/api/holdings` | Observable<Holding[]> |
| `TradesService` | `/api/trades` | Observable<KiteTrade[]> |
| `CorePortfolioService` | `/api/core/positions` | Observable<CorePosition[]> |
| `PortfolioService` | `/api/holdings` | BehaviorSubject (cached) |
| `StockReturnsService` | `/api/market/returns/*` | Observable<T> |
| `MarketChartService` | `/api/market/chart/:symbol` | Observable<MarketChartResponse> |
| `InvestmentsService` | `/api/investments/*` | Observable<MigrateResult[]> |
| `KiteAuthService` | `/api/auth/*` | Signal + HTTP |
| `CommentsService` | IndexedDB (Dexie) | async/Promise |
| `StockService` | `/api/stocks` | Observable |
| `PriceSyncService` | `/api/sync/eod` | Observable |

## Data Models

### Domain Entities

```
SwingGroupPosition          — open/closed swing trade group
  ├── id, symbol, exchange
  ├── thesisTitle, thesisNotes, strategyTag, timeframe
  ├── status: OPEN | CLOSED
  ├── qty, avgBuyPrice, positionSize, ltp
  ├── pl, plPct, plPctDaily, plPctWeekly, plPct15days, plPctMonthly
  └── openedAt, closedAt, createdAt, updatedAt

KiteTrade                   — raw trade from Zerodha/Kite
  ├── tradeId, orderId, tradingsymbol, exchange
  ├── transactionType: BUY | SELL
  ├── quantity, price, totalCharges
  ├── classification: UNCLASSIFIED | SWING | CORE | ...
  └── tradeTimestamp, syncedAt

Holding                     — current Kite equity holding
  ├── symbol, exchange, quantity, averagePrice, lastPrice
  ├── pnl, dayChange, dayChangePercentage
  └── syncedAt

CorePosition / CorePositionUi — long-term investment position
  ├── symbol, quantity, avgPrice, latestPrice
  ├── totalInvestment, currentValue, pl, plLossPct
  ├── dayPnl/Pct, weekPnl/Pct, monthPnl/Pct
  └── (Ui adds) invWtPct, valWtPct, driftPct

StockReturnsRow             — market breadth / returns screen
  ├── symbol, lastClose, tradeDate
  ├── dayPct, weekPct, monthPct
  ├── trendAligned (bool), volumeRatio20, atrPct
  └── (TrendPullbackRow adds) bucketRank, deltaInAtr, stoploss fields

MarketChartResponse         — OHLC bars + indicators
  ├── bars[]: open, high, low, close, volume
  └── indicators: ema20, ema50, ema200, rsi14, macd, macdSignal, macdHist

CommentItem                 — local thesis/notes (IndexedDB)
  ├── symbol, text, createdAt
  ├── type: THESIS | NOTE
  └── duration, stopLoss, watch

WatchlistDeviationResponse  — zone tracking
  ├── symbol, lowPrice, highPrice, lastClose
  ├── devFromLow, devFromLowPct, bandPositionPct
  ├── openSwingQty, openSwingInv
  └── signal, nearSupport, insideBand, breakdownBelowLow, breakoutAboveHigh
```

## Routing Architecture

Flat child routes under `MainLayoutComponent`. No lazy loading, no route guards.

```typescript
// app.routes.ts
{ path: '',  component: MainLayoutComponent, children: [
  { path: 'swing',        component: SwingTradeGroupsComponent },
  { path: 'trades',       component: TradesToGroupComponent },
  { path: 'holdings',     component: HoldingsListComponent },
  { path: 'core',         component: CorePortfolioComponent },
  { path: 'watchlist',    component: WatchlistDeviationComponent },
  { path: 'returns',      component: ReturnsComponent },
  { path: 'returns/chart/:symbol', component: ReturnsChartComponent },
  { path: 'closed-swing', component: ClosedSwingReportComponent },
  { path: '**',           redirectTo: 'swing' }
]}
```

## Styling System

**Theme:** Dark mode trading terminal

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0b0f14` | App bg |
| Text | `#e7edf5` | Primary text |
| Accent | `#8ab4ff` | Active/hover, links |
| Positive | `#3cdc8c` | PnL gain |
| Negative | `#ff5a78` | PnL loss |
| Border | `#223042` | Cards, table lines |

**Responsive breakpoints:**
- ≤768px — HoldingsListComponent switches table → cards
- ≤820px — SwingTradeGroupsComponent switches table → cards

## Backend API Summary (from OpenAPI spec)

### Controllers

| Tag | Base Path | Responsibility |
|-----|-----------|---------------|
| swing-group-controller | `/swing/groups` | CRUD for swing trade groups |
| swing-closed-report-controller | `/swing/reports` | Closed trade analysis |
| kite-trade-controller | `/trades` | Trade sync + listing |
| holding-controller | `/holdings` | Holdings sync + listing |
| core-portfolio-controller | `/core/positions` | Core position view |
| stock-returns-controller | `/market/returns` | Returns + pullbacks screen |
| market-chart-controller | `/market/chart/:symbol` | OHLC + indicator data |
| invst-trade-controller | `/investments` | Core trade migration |
| watchlist-controller | `/watchlist` | Watchlist zone CRUD + deviation |
| sync-controller | `/sync/eod` | End-of-day data orchestration |
| zone-pipeline-controller | `/zones/pipeline` | Zone computation pipeline |
| trade-match-controller | `/matches` | Buy/sell trade matching |
| stock-stats-controller | `/stats` | Stats sync |

### Notable Backend Schemas (not yet surfaced in frontend)

- `ZoneEventResponse` — support/resistance zone events (TOUCH, HOLD, BREAK, RECLAIM, REJECT)
- `SellingExhaustionRowDto` — selling exhaustion filter screen
- `TradeMatch` — matched buy/sell pairs with PnL
- `WatchlistZone` — watchlist price band (low/high)
- `KiteOrder` — raw Kite order (pre-trade)

These endpoints exist in the backend but have no corresponding frontend components yet.

## Build & Deploy

- **Dev:** `ng serve` with proxy → `castle.local`
- **Prod:** `ng build` → static files served by nginx on `castle.local`
- **Bundle budgets:** 1MB max initial, 8KB max per component stylesheet
- **Angular builder:** `@angular/build:application` (esbuild-based, fast)