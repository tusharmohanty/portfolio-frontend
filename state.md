# State Management — Stock Portfolio App

## Overview

No global state store. State is managed at the component level using **Angular Signals** (`signal()`, `computed()`), with services acting as stateless data-fetchers (returning `Observable<T>`). A few services maintain shared streams via `BehaviorSubject`.

---

## Signal-Based Component State

The dominant pattern. Each component declares its own signals and derived computed properties.

### SwingTradeGroupsComponent

```typescript
// Input/filter signals
status       = signal<SwingStatusFilter>('OPEN')   // OPEN | CLOSED | ALL
sortKey      = signal<SwingSortKey>('updatedAt')
sortDir      = signal<SortDir>('desc')
symbolFilter = signal<string>('')
isMobile     = signal<boolean>(window.matchMedia('(max-width: 820px)').matches)

// Data signals
allRows = signal<SwingGroupPosition[]>([])
loading = signal<boolean>(false)
error   = signal<string | null>(null)

// Derived (computed)
visibleRows = computed(() => allRows filtered by status + symbolFilter)
viewRows    = computed(() => visibleRows sorted by sortKey + sortDir)
summary     = computed(() => { investment, pl, plPct } across visibleRows)
```

**Data flow:**
```
ngOnInit → loadAll() → service.listGroups() → subscribe → allRows.set(data)
             ↓
      computed auto-updates → template re-renders
```

---

### TradesToGroupComponent

```typescript
// Data signals
trades     = signal<KiteTrade[]>([])
openGroups = signal<SwingGroupPosition[]>([])

// UI state signals
q               = signal<string>('')           // search query
showAssignDrawer = signal<boolean>(false)
selectedGroupId  = signal<number | null>(null)

// Async flags (plain booleans, not signals)
creating      = false
addingToGroup = false
loadingGroups = false

// Selection (Set, mutated directly)
selected = new Set<number>()  // kiteTradeIds

// Form (plain object)
form = { symbol, exchange, thesisTitle, thesisNotes, strategyTag, timeframe }

// Computed
filtered            = computed(() => trades filtered by q, sorted by time/symbol)
selectedCount       = computed(() => selected.size)
selectionSummary    = computed(() => { symbols[], exchanges[] } from selected trades)
canAssignToExisting = computed(() => selectionSummary has exactly 1 symbol)
matchingOpenGroups  = computed(() => openGroups filtered by selectionSummary.symbol)
selectedQtyBreakup  = computed(() => { buy, sell, net } quantity from selected trades)
```

**Workflows (multi-step async):**

1. **Create group + assign trades:**
   ```
   service.createGroup(form) → groupId
     → service.addTradesToGroup(groupId, {ids}) → success
     → reload trades
   ```

2. **Assign to existing group:**
   ```
   service.addTradesToGroup(selectedGroupId, {ids}) → success
     → reload trades
   ```

3. **Migrate to core:**
   ```
   investmentsService.migrateBulk({kiteTradeIds}) → MigrateResult[]
     → reload trades
   ```

4. **Unmigrate from core:**
   ```
   forEach selected → investmentsService.unmigrateOne(id)
   // ⚠ Manual done counter, not Promise.all
   ```

---

### ClosedSwingReportComponent

```typescript
// Date range signals (input)
from = signal<string>(firstDayOfMonth)
to   = signal<string>(today)

// Data signals
summary = signal<ClosedSwingReportSummaryDto | null>(null)
rows    = signal<ClosedSwingReportRowDto[]>([])
monthly = signal<ClosedSwingMonthlyBreakdownDto[]>([])
sortKey = signal<string>('closedAt')
sortDir = signal<'asc'|'desc'>('desc')

// Computed
viewRows       = computed(() => rows sorted)
totalQty       = computed(() => sum of row qty)
totalBuyValue  = computed(() => sum)
totalSellValue = computed(() => sum)
totalCharges   = computed(() => sum)
totalNetPl     = computed(() => sum)
```

**Data fetch (parallel):**
```typescript
Promise.all([
  service.getClosedSummary(from, to),
  service.getClosedTrades(from, to),
  service.getClosedMonthly(from, to)
]).then(([summary, rows, monthly]) => { ... signals.set(...) })
```

---

### HoldingsListComponent

Uses **class properties** (not signals) + `ChangeDetectorRef` for manual change detection. Older pattern.

```typescript
holdings: Holding[] = []
filtered: Holding[] = []
sortKey = 'pnl'
sortDir = 'desc'
showMobile = window.innerWidth <= 768  // @HostListener('resize')
```

---

### ReturnsComponent

```typescript
mode    = signal<'ALL' | 'PULLBACKS'>('ALL')
rows    = signal<StockReturnsRow[]>([])
pullbacks = signal<TrendPullbackRow[]>([])
sortKey = signal<string>('dayPct')
sortDir = signal<SortDir>('desc')
```

**URL persistence:** `mode` is synced to `?filter=` query param (survives chart navigation and page refresh).

---

## Shared Service State

### PortfolioService

```typescript
private holdingsSubject = new BehaviorSubject<Holding[]>([])
readonly holdings$ = this.holdingsSubject.asObservable()
```

Components can subscribe to `holdings$` to get live updates when holdings are refreshed.

### CommentsService

```typescript
private commentsSubject    = new BehaviorSubject<CommentItem[]>([])
private loadingSubject     = new BehaviorSubject<boolean>(false)
readonly comments$         = this.commentsSubject.asObservable()
readonly loading$          = this.loadingSubject.asObservable()
```

Backed by Dexie (IndexedDB). Async CRUD operations update the BehaviorSubject on completion.

### KiteAuthService

```typescript
readonly loggedIn = signal<boolean>(false)
```

Set on app init by checking `/api/auth/status`.

---

## IndexedDB Schema (Dexie)

**Database:** `comments-db.ts`

```
Table: comments
  ++id          (auto-increment PK)
  symbol        (indexed — for per-symbol queries)
  text
  createdAt     (ISO string)
  type          'THESIS' | 'NOTE'
  duration?
  stopLoss?
  watch?        boolean
```

---

## State Lifecycle Summary

| Component | Init Trigger | Data Source | State Container |
|-----------|-------------|-------------|-----------------|
| SwingTradeGroups | ngOnInit | GET /api/swing/groups | Signals |
| TradesToGroup | ngOnInit | GET /api/trades?classification=UNCLASSIFIED | Signals |
| ClosedSwingReport | ngOnInit + date change | GET /api/swing/reports/* (parallel) | Signals |
| HoldingsList | ngOnInit | GET /api/holdings | Class properties |
| CorePortfolio | ngOnInit | GET /api/core/positions | Class properties |
| ReturnsComponent | ngOnInit | GET /api/market/returns/* | Signals |
| ReturnsChart | ngOnInit (route param) | GET /api/market/chart/:symbol | Class properties |
| WatchlistDeviation | ngOnInit | GET /api/watchlist/deviation | Class properties |

---

## Known State Issues

1. **No shared cache** — each component independently fetches data; switching routes re-fetches
2. **TradesToGroupComponent unmigration** uses `forEach` + done counter instead of `Promise.all` — race condition risk if one fails mid-loop
3. **HoldingsListComponent** uses `ChangeDetectorRef.markForCheck()` manually — indicates it was written before Signals adoption; should be migrated
4. **No optimistic updates** — UI only reflects API responses; operations feel slow on poor network
5. **No `takeUntilDestroyed()`** visible in all components — potential memory leaks on component destroy for long-lived subscriptions

---

## Recommended Evolution Path

1. **Short term:** Add `takeUntilDestroyed()` to all HTTP subscriptions
2. **Medium term:** Migrate `HoldingsListComponent` and `ReturnsChartComponent` to Signals pattern
3. **Medium term:** Replace `TradesToGroupComponent` unmigration forEach with `Promise.all`
4. **Long term:** Add a simple service-level cache (e.g., `shareReplay(1)` on HTTP observables) to avoid re-fetching on route change
5. **Long term:** If cross-component sync becomes complex, consider NgRx Signal Store (lightweight, compatible with current Signals approach)