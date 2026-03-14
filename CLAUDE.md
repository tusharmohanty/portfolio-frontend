# CLAUDE.md — Stock Portfolio App (Frontend)

## Project Overview

Angular 21 SPA for managing a personal stock portfolio backed by a Spring Boot API (`castle.local`). The app tracks swing trades, core long-term holdings, Kite (Zerodha) trade imports, market returns, and watchlist deviation.

## Tech Stack

- **Framework:** Angular 21.1.4, standalone components (no NgModule)
- **State:** Angular Signals + `computed()` for derived state
- **HTTP:** Angular `HttpClient`, all calls routed via `/api` proxy
- **Charts:** `lightweight-charts` v5 (TradingView)
- **Local Storage:** `dexie` v4 (IndexedDB) — used for comments/thesis notes
- **Testing:** `vitest` v4 + `jsdom`
- **Build:** Angular CLI 21 / `@angular/build:application`

## Development Commands

```bash
# Start dev server (proxies /api → castle.local)
ng serve

# Build for production
ng build

# Run tests
npm test

# Lint
ng lint
```

## Proxy Config

`src/proxy.conf.json` maps `/api/*` to `http://castle.local/api/*` during local dev.
In production the nginx reverse proxy on `castle.local` handles routing.

## Backend API

- **Base URL:** `http://castle.local`
- **Docs:** `https://castle.local/api/v3/api-docs` (OpenAPI 3.0)
- **Auth:** Cookie-based via Kite OAuth redirect (`/auth/kite/login?returnTo=...`)

### Key API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/swing/groups` | List swing groups (params: status, symbol, sort, dir) |
| POST | `/api/swing/groups` | Create new swing group |
| POST | `/api/swing/groups/{id}/trades` | Add Kite trades to a group |
| GET | `/api/swing/reports/closed-summary` | Closed trade summary (date range) |
| GET | `/api/swing/reports/closed-trades` | Closed trade rows (date range) |
| GET | `/api/swing/reports/closed-monthly` | Monthly breakdown (date range) |
| GET | `/api/holdings` | All portfolio holdings |
| GET | `/api/trades?classification=UNCLASSIFIED` | Unclassified Kite trades |
| GET | `/api/core/positions` | Core portfolio positions |
| GET | `/api/market/returns/latest` | Stock returns (day/week/month %) |
| GET | `/api/market/returns/trend-pullbacks` | Trend pullback opportunities |
| GET | `/api/market/chart/{symbol}` | OHLC chart data |
| POST | `/api/investments/migrate` | Bulk migrate trades → core |
| POST | `/api/investments/unmigrate/{id}` | Unmigrate single trade |
| GET | `/api/watchlist/deviation` | Watchlist zone deviation |
| POST | `/api/sync/eod` | Trigger end-of-day sync |

## Project Structure

```
src/app/
├── app.ts                    # Root component
├── app.routes.ts             # All routes
├── app.config.ts             # Providers (Router, HttpClient)
├── components/
│   ├── main-layout/          # Shell: nav, auth, EOD sync
│   ├── swing-trade-groups/   # Swing group list + filters
│   ├── trades-to-group/      # Classify unclassified Kite trades
│   ├── closed-swing-report/  # P&L analysis on closed trades
│   ├── holdings-list/        # Equity holdings (Kite)
│   ├── core-portfolio/       # Long-term core positions
│   ├── returns/              # Market returns + pullbacks
│   ├── returns-chart/        # OHLC chart detail view
│   ├── watchlist-deviation/  # Watchlist zone tracking
│   └── stocks/add-stock-modal/
├── services/                 # 12 services, all providedIn: 'root'
└── models/                   # TypeScript interfaces per domain
```

## Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/swing` | SwingTradeGroupsComponent | Default landing |
| `/trades` | TradesToGroupComponent | Trade classification |
| `/holdings` | HoldingsListComponent | |
| `/core` | CorePortfolioComponent | |
| `/watchlist` | WatchlistDeviationComponent | |
| `/returns` | ReturnsComponent | Preserves filter in URL params |
| `/returns/chart/:symbol` | ReturnsChartComponent | |
| `/closed-swing` | ClosedSwingReportComponent | |

## Component Conventions

- All components are **standalone** — import only what they use
- Use `inject()` for DI (not constructor injection)
- Use `signal()` / `computed()` for local reactive state
- HTTP subscriptions in `ngOnInit` or constructor; unsubscribe via `takeUntilDestroyed()`
- Responsive: dual table/card layouts — breakpoints at 768px or 820px
- Positive PnL → CSS class `pos`, negative → `neg`, zero → `neu`

## Known Issues / Tech Debt

1. No global HTTP error interceptor — each service logs errors independently
2. Client-side filtering in `SwingTradeGroupsComponent` — fetches all groups, filters in browser
3. `TradesToGroupComponent` core removal uses a manual forEach loop with done counter instead of `Promise.all` — potential race condition
4. No route guards or lazy loading
5. Inconsistent patterns: some components use Signals, some use plain class properties + `ChangeDetectorRef`
6. No unit test coverage (Vitest configured but tests minimal)
7. Date handling mixed: ISO strings vs Date objects, no date library