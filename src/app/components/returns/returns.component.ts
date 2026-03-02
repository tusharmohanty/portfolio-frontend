// returns.component.ts (DROP-IN) — preserves filter when going to chart + back
import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockReturnsService } from '../../services/stock-returns.service';
import { StockReturnsRow } from '../../models/stock-returns-row';
import { TrendPullbackRow } from '../../models/trend-pullback-row';
import { ActivatedRoute, Router } from '@angular/router';

type SortKey =
  | 'symbol' | 'tradeDate' | 'lastClose'
  | 'dayPct' | 'weekPct' | 'monthPct'
  | 'trendAligned' | 'volumeRatio20' | 'atrPct';

type ReturnsFilter = 'ALL' | 'PULLBACKS';
type ReturnsRow = StockReturnsRow | TrendPullbackRow;

@Component({
  selector: 'app-returns',
  templateUrl: './returns.component.html',
  imports: [CommonModule],
  styleUrls: ['./returns.component.css']
})
export class ReturnsComponent {
  rows = signal<ReturnsRow[]>([]);
  loading = signal(false);

  // ✅ filter persisted via URL query param
  filter = signal<ReturnsFilter>('ALL');

  sortKey = signal<SortKey>('weekPct');
  sortDir = signal<'asc' | 'desc'>('desc');
  query = signal<string>('');
  trackBySymbol = (_: number, r: ReturnsRow) => r.symbol;

  serverSort = signal(false);

  chartSymbol = signal<string | null>(null);
  chartOpen = computed(() => !!this.chartSymbol());

  /** ✅ Type guard usable from template + TS */
  isPullbackRow(r: ReturnsRow): r is TrendPullbackRow {
    return (r as any).bucketRank !== undefined;
  }

  /** ✅ Template flag */
  showPullbackColumns = computed(() => this.filter() === 'PULLBACKS');

  viewRows = computed(() => {
  const data = [...this.rows()];
  const q = this.query().trim().toUpperCase();

  // ✅ apply symbol filter first (works for ALL + PULLBACKS)
  const filtered = !q
    ? data
    : data.filter(r => (r.symbol || '').toUpperCase().includes(q));

  // ✅ Pullbacks mode: keep server order (bucket_rank, delta_in_atr, volume_ratio_20)
  if (this.filter() === 'PULLBACKS') return filtered;

  const key = this.sortKey();
  const dir = this.sortDir();
  filtered.sort((a, b) => this.compare(a, b, key, dir));
  return filtered;
});

  constructor(
    private api: StockReturnsService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // ✅ Restore filter from URL whenever it changes (Back button, refresh, etc.)
    this.route.queryParamMap.subscribe(qp => {
      const raw = (qp.get('filter') || 'ALL').toUpperCase();
      const next: ReturnsFilter = raw === 'PULLBACKS' ? 'PULLBACKS' : 'ALL';

      if (this.filter() !== next) {
        this.filter.set(next);
        this.load();
      }
    });

    // Initial load (if URL has filter, subscription will also load when it fires)
    this.load();
  }

  load() {
    this.loading.set(true);

    const mode = this.filter();
    const key = this.sortKey();
    const dir = this.sortDir();

    const call$ =
      mode === 'PULLBACKS'
        ? this.api.trendPullbacks()
        : (this.serverSort() ? this.api.latest(key, dir) : this.api.latest());

    call$.subscribe({
      next: (r) => this.rows.set((r ?? []) as ReturnsRow[]),
      error: (err) => {
        console.error('returns API error:', err);
        this.rows.set([]);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false)
    });
  }

  // ✅ Persist filter in URL so it survives navigation to chart and back
  onFilterChange(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value as ReturnsFilter;
    const next: ReturnsFilter = value === 'PULLBACKS' ? 'PULLBACKS' : 'ALL';

    this.filter.set(next);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: next },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.load();
  }

  toggleSort(key: SortKey) {
    // ✅ Lock sorting in Pullbacks view (order is meaningful)
    if (this.filter() === 'PULLBACKS') return;

    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'symbol' ? 'asc' : 'desc');
    }
    if (this.serverSort()) this.load();
  }

  // ✅ carry filter into chart page URL so Back restores it
  openChart(symbol: string) {
    const sym = (symbol || '').trim().toUpperCase();
    if (!sym) return;

    this.router.navigate(['/returns/chart', sym], {
      queryParams: { filter: this.filter() }
    });
  }

  // (kept for compatibility — not used when chart is its own page)
  closeChart() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { chart: null },
      queryParamsHandling: 'merge'
    });
  }

  // -------------------------------
  // ✅ Helpers for template (NO casts in HTML)
  // -------------------------------

  /** Header: last day label (works for both row types) */
  lastDay(): string {
    const r = this.viewRows()[0] as any;
    return r?.tradeDate ?? '—';
  }

  /** Common numeric fields (exist on both DTOs with same names) */
  getLastClose(r: ReturnsRow): number | null | undefined { return (r as any).lastClose; }
  getDayPct(r: ReturnsRow): number | null | undefined { return (r as any).dayPct; }
  getWeekPct(r: ReturnsRow): number | null | undefined { return (r as any).weekPct; }
  getMonthPct(r: ReturnsRow): number | null | undefined { return (r as any).monthPct; }
  getAtrPct(r: ReturnsRow): number | null | undefined { return (r as any).atrPct; }

  /** Vol ratio (named consistently in both: volumeRatio20) */
  getVolRatio(r: ReturnsRow): number | null | undefined {
    return (r as any).volumeRatio20 ?? null;
  }

  /** Pullback-only fields */
  getDeltaInAtr(r: ReturnsRow): number | null | undefined {
    return this.isPullbackRow(r) ? r.deltaInAtr : null;
  }

  getBucketRank(r: ReturnsRow): number | null | undefined {
    return this.isPullbackRow(r) ? r.bucketRank : null;
  }

  getStopAtr15(r: ReturnsRow): number | null | undefined {
    return this.isPullbackRow(r) ? r.stoplossAtr1_5 : null;
  }

  getTrendStop(r: ReturnsRow): number | null | undefined {
    return this.isPullbackRow(r) ? r.stoplossEma20MinusAtr : null;
  }

  /** Pos/Neg helpers for CSS classes */
  isPos(v: number | null | undefined): boolean { return (v ?? 0) > 0; }
  isNeg(v: number | null | undefined): boolean { return (v ?? 0) < 0; }

  /** ALL-mode badge only */
  trendBadge(r: ReturnsRow): string {
    const anyRow: any = r;
    return anyRow.trendAligned ? 'TREND' : 'NO';
  }

  private compare(a: any, b: any, key: SortKey, dir: 'asc' | 'desc') {
    const av = a?.[key];
    const bv = b?.[key];

    // nulls last
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    // boolean
    if (typeof av === 'boolean' && typeof bv === 'boolean') {
      const x = (av === bv) ? 0 : (av ? -1 : 1);
      return dir === 'asc' ? -x : x;
    }

    // string
    if (typeof av === 'string' || typeof bv === 'string') {
      const x = String(av).localeCompare(String(bv));
      return dir === 'asc' ? x : -x;
    }

    // number
    const x = Number(av) - Number(bv);
    return dir === 'asc' ? x : -x;
  }

  fmt(n: number | null | undefined, d = 2) {
    if (n == null) return '—';
    return Number(n).toFixed(d);
  }

  onSortChange(ev: Event) {
    if (this.filter() === 'PULLBACKS') return;
    const value = (ev.target as HTMLSelectElement).value;
    this.toggleSort(value as SortKey);
  }
}