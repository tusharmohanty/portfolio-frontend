import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

type SortMode = 'NEAREST_SUPPORT' | 'BREAKDOWNS_FIRST' | 'BREAKOUTS_FIRST' | 'BAND_POSITION';

export interface WatchlistDeviationRow {
  symbol: string;
  tradeDate: string; // yyyy-mm-dd
  lastClose: number;

  lowPrice: number;
  highPrice: number;

  devFromLowPct: number;       // numeric from API
  bandPositionPct: number;     // numeric from API

  nearSupport: boolean;
  insideBand: boolean;
  breakdownBelowLow: boolean;
  breakoutAboveHigh: boolean;

  signal: string; // e.g. NEAR_SUPPORT, BREAKDOWN_BELOW_LOW, BREAKOUT_ABOVE_HIGH, INSIDE_BAND, OUTSIDE_BAND
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

  // call your endpoint (adjust base path if you serve behind /api)
  private readonly url = '/api/watchlist/deviation';

  constructor(private http: HttpClient,
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
    // lower is more urgent / more interesting
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
          // nearSupport first; then lowest dev%; then symbol
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
          // then most negative dev% first (i.e., below low)
          const d = this.cmpNum(a.devFromLowPct, b.devFromLowPct);
          if (d !== 0) return d;
          return a.symbol.localeCompare(b.symbol);
        };

      case 'BREAKOUTS_FIRST':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          const ar = a.breakoutAboveHigh ? 0 : 1;
          const br = b.breakoutAboveHigh ? 0 : 1;
          if (ar !== br) return ar - br;
          // then highest dev% first
          const d = this.cmpNum(b.devFromLowPct, a.devFromLowPct);
          if (d !== 0) return d;
          return a.symbol.localeCompare(b.symbol);
        };

      case 'BAND_POSITION':
        return (a: WatchlistDeviationRow, b: WatchlistDeviationRow) => {
          // lowest bandPositionPct first (near low). Flip if you want "near high"
          const d = this.cmpNum(a.bandPositionPct, b.bandPositionPct);
          if (d !== 0) return d;

          // tie-break with urgency + dev%
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

    const filtered = !q
      ? data
      : data.filter(r => r.symbol.includes(q));

    filtered.sort(this.sortFn(mode));
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
  
}