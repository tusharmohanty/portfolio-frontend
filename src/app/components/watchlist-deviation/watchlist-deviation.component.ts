import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

type SortMode =
  | 'NEAREST_SUPPORT'
  | 'BREAKDOWNS_FIRST'
  | 'BREAKOUTS_FIRST'
  | 'BAND_POSITION'
  | 'INVESTMENT_DESC'
  | 'INVESTMENT_ASC';

export interface WatchlistDeviationRow {
  symbol: string;
  tradeDate: string; // yyyy-mm-dd
  lastClose: number;

  lowPrice: number;
  highPrice: number;

  devFromLowPct: number;   // numeric from API
  bandPositionPct: number; // numeric from API

  nearSupport: boolean;
  insideBand: boolean;
  breakdownBelowLow: boolean;
  breakoutAboveHigh: boolean;

  openSwingInv?: number;
  openSwingQty?: number;

  signal: string;
}

@Component({
  selector: 'app-watchlist-deviation',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './watchlist-deviation.component.html',
  styleUrls: ['./watchlist-deviation.component.css'],
})
export class WatchlistDeviationComponent {

  rows = signal<WatchlistDeviationRow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  filter = signal<string>('ALL');

  sortMode = signal<SortMode>('NEAREST_SUPPORT');
  query = signal<string>(''); // optional search

  private readonly url = '/api/watchlist/deviation';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.http.get<WatchlistDeviationRow[]>(this.url).subscribe({
      next: (data) => {
        this.rows.set((data || []).map(r => ({
          ...r,
          symbol: (r.symbol || '').toUpperCase(),
        })));
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(e?.message || 'Failed to load watchlist deviation data');
        this.loading.set(false);
      },
    });
  }

  // ---------- helpers ----------
  private cmpNum(a: number | null | undefined, b: number | null | undefined) {
    const av = (a ?? 0);
    const bv = (b ?? 0);
    return av === bv ? 0 : av < bv ? -1 : 1;
  }

  private signalRank(r: WatchlistDeviationRow): number {
    if (r.breakoutAboveHigh) return 1;
    if (r.breakdownBelowLow) return 2;
    if (r.nearSupport) return 3;
    if (r.insideBand) return 4;
    return 5;
  }

  private sortFn(mode: SortMode) {
    switch (mode) {

      case 'NEAREST_SUPPORT':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const an = a.nearSupport ? 0 : 1;
          const bn = b.nearSupport ? 0 : 1;
          if (an !== bn) return an - bn;

          const d = this.cmpNum(a.devFromLowPct, b.devFromLowPct);
          if (d !== 0) return d;

          return a.symbol.localeCompare(b.symbol);
        };

      case 'BREAKDOWNS_FIRST':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const ar = a.breakdownBelowLow ? 0 : 1;
          const br = b.breakdownBelowLow ? 0 : 1;
          if (ar !== br) return ar - br;

          // most negative dev% first => ascending devFromLowPct
          const d = this.cmpNum(a.devFromLowPct, b.devFromLowPct);
          if (d !== 0) return d;

          return a.symbol.localeCompare(b.symbol);
        };

      case 'BREAKOUTS_FIRST':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const ar = a.breakoutAboveHigh ? 0 : 1;
          const br = b.breakoutAboveHigh ? 0 : 1;
          if (ar !== br) return ar - br;

          // highest dev% first => descending devFromLowPct
          const d = this.cmpNum(b.devFromLowPct, a.devFromLowPct);
          if (d !== 0) return d;

          return a.symbol.localeCompare(b.symbol);
        };

      case 'INVESTMENT_DESC':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const d = this.cmpNum((b.openSwingInv ?? 0), (a.openSwingInv ?? 0)); // desc
          if (d !== 0) return d;
          return a.symbol.localeCompare(b.symbol);
        };

      case 'INVESTMENT_ASC':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const d = this.cmpNum((a.openSwingInv ?? 0), (b.openSwingInv ?? 0)); // asc
          if (d !== 0) return d;
          return a.symbol.localeCompare(b.symbol);
        };

      case 'BAND_POSITION':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const d = this.cmpNum(a.bandPositionPct, b.bandPositionPct);
          if (d !== 0) return d;

          const r = this.signalRank(a) - this.signalRank(b);
          if (r !== 0) return r;

          const d2 = this.cmpNum(a.devFromLowPct, b.devFromLowPct);
          if (d2 !== 0) return d2;

          return a.symbol.localeCompare(b.symbol);
        };
    }
  }

  viewRows = computed(() => {
    const q = this.query().trim().toUpperCase();
    const mode = this.sortMode();
    const data = [...this.rows()];

    const filtered = !q ? data : data.filter(r => r.symbol.includes(q));

    const cmp = this.sortFn(mode) ?? ((a: WatchlistDeviationRow, b: WatchlistDeviationRow) =>
      a.symbol.localeCompare(b.symbol)
    );

    filtered.sort(cmp);
    return filtered;
  });

  // UI: labels + chips
  signalLabel(r: WatchlistDeviationRow): string {
    if (r.breakoutAboveHigh) return 'Breakout';
    if (r.breakdownBelowLow) return 'Breakdown';
    if (r.nearSupport) return 'Near Support';
    if (r.insideBand) return 'In Band';
    return 'Outside';
  }

  devText(r: WatchlistDeviationRow): string {
    const v = r.devFromLowPct ?? 0;
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}%`;
  }

  bandText(r: WatchlistDeviationRow): string {
    const v = r.bandPositionPct ?? 0;
    return `${v.toFixed(0)}%`;
  }

  openChart(symbol: string) {
    const sym = (symbol || '').trim().toUpperCase();
    if (!sym) return;

    this.router.navigate(['/returns/chart', sym], {
      queryParams: { filter: this.filter() }
    });
  }

  closeChart() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { chart: null },
      queryParamsHandling: 'merge'
    });
  }

  toggleInvSort() {
    const m = this.sortMode();
    this.sortMode.set(m === 'INVESTMENT_DESC' ? 'INVESTMENT_ASC' : 'INVESTMENT_DESC');
  }
}