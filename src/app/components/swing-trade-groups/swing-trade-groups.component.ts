import { Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwingTradeService } from '../../services/swing-trade.service';
import {
  SwingGroupPosition,
  SwingSortKey,
  SwingStatusFilter,
  SortDir
} from '../../models/swing-group-position.model';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-swing-trade-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, DatePipe],
  templateUrl: './swing-trade-groups.component.html',
  styleUrls: ['./swing-trade-groups.component.css'],
})
export class SwingTradeGroupsComponent {
  // responsive
  isMobile = signal(window.matchMedia('(max-width: 820px)').matches);

  // filter + client sort state
  status = signal<SwingStatusFilter>('OPEN');
  sortKey = signal<SwingSortKey>('updatedAt');
  sortDir = signal<SortDir>('desc');

  loading = signal(false);
  error = signal<string | null>(null);

  // ✅ keep the server response here (unsorted)
  allRows = signal<SwingGroupPosition[]>([]);

  loggedIn = signal(false);

  sortOptions: { key: SwingSortKey; label: string }[] = [
     { key: 'openedAt', label: 'Entry' },
    { key: 'updatedAt', label: 'Updated' },
    { key: 'pl', label: 'P/L' }, // ✅ ADDED
    { key: 'plPct', label: '% P/L' },
    { key: 'positionSize', label: 'Pos Size' },
    { key: 'plPctDaily', label: '% PL Day' },
    { key: 'plPctWeekly', label: '% PL Week' },
    { key: 'plPctMonthly', label: '% PL Monthly' },
    { key: 'plPct15days', label: '% PL 15 Days' },
    { key: 'targetDeltaPct', label: '% Delta vs Target' },
    { key: 'holdingPeriodDays', label: 'Holding Period' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: SwingTradeService,
    private http: HttpClient
  ) {
    const mq = window.matchMedia('(max-width: 820px)');
    mq.addEventListener('change', e => this.isMobile.set(e.matches));

    this.checkKiteAuth();

    // ✅ Load once. Sort happens in UI.
    this.loadAll();
  }

  checkKiteAuth() {
    // returns 200 text token OR 409 JSON
    this.http.get('/auth/kite/token', { responseType: 'text' }).subscribe({
      next: (token: string) => {
        this.loggedIn.set(!!token && token.trim().length > 10);
      },
      error: () => {
        this.loggedIn.set(false);
      }
    });
  }

  startKiteLogin() {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth/kite/login?returnTo=${returnTo}`;
  }

  /** ✅ Single REST fetch: get everything once, then UI filter/sort */
  loadAll() {
    this.loading.set(true);
    this.error.set(null);

    // fetch ALL once. Server sort params are irrelevant now; still pass something valid.
    this.api.getGroups('ALL', 'updatedAt', 'desc').subscribe({
      next: (data: SwingGroupPosition[]) => {
        this.allRows.set(data ?? []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message ?? 'Failed to load swing groups');
        this.loading.set(false);
      }
    });
  }

  /** ✅ visible rows based on status filter */
  visibleRows = computed(() => {
    const st = this.status();
    const src = this.allRows();

    if (st === 'ALL') return src;
    return src.filter(r => (r.status || '').toUpperCase() === st);
  });

  /** ✅ final rows: filter + client sort */
  viewRows = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const rows = [...this.visibleRows()];

    const factor = dir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      const va = this.sortValue(a, key);
      const vb = this.sortValue(b, key);

      // null/undefined last (both dirs)
      const aNil = va === null || va === undefined || (typeof va === 'number' && Number.isNaN(va as number));
      const bNil = vb === null || vb === undefined || (typeof vb === 'number' && Number.isNaN(vb as number));
      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;

      // numbers
      if (typeof va === 'number' && typeof vb === 'number') {
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * factor;
      }

      // dates
      if (va instanceof Date && vb instanceof Date) {
        const ta = va.getTime();
        const tb = vb.getTime();
        if (ta === tb) return 0;
        return (ta < tb ? -1 : 1) * factor;
      }

      // strings
      const sa = String(va).toUpperCase();
      const sb = String(vb).toUpperCase();
      if (sa === sb) return 0;
      return (sa < sb ? -1 : 1) * factor;
    });

    return rows;
  });

  /** Aggregates follow current filter */
  summary = computed(() => {
    const visible = this.visibleRows();
    const inv = visible.reduce((s, r) => s + (Number(r.positionSize ?? 0) || 0), 0);
    const pl = visible.reduce((s, r) => s + (Number(r.pl ?? 0) || 0), 0);
    const plPct = inv !== 0 ? (pl / inv) * 100 : 0;
    return { count: visible.length, inv, pl, plPct };
  });

  /** ✅ Sorting UX: click header toggles dir if same key */
  setSort(key: SwingSortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
  }

  toggleSortDir() {
    this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
  }

  /** ✅ Filter UX: NO REST needed because we already have ALL. */
  onStatusChange(v: any) {
    const next = (String(v || 'ALL').toUpperCase() as SwingStatusFilter);
    this.status.set(next);
  }

  /** map sort key -> comparable value */
  private sortValue(r: SwingGroupPosition, key: SwingSortKey): number | string | Date | null {
    switch (key) {
      case 'openedAt': return this.toDate((r as any).openedAt);
      case 'updatedAt': return this.toDate(r.updatedAt);
      case 'pl': return this.num(r.pl); // ✅ ADDED
      case 'positionSize': return this.num(r.positionSize);
      case 'holdingPeriodDays': return this.num(r.holdingPeriodDays);
      case 'plPct': return this.num(r.plPct);
      case 'plPctDaily': return this.num((r as any).plPctDaily);
      case 'plPctWeekly': return this.num((r as any).plPctWeekly);
      case 'plPctMonthly': return this.num((r as any).plPctMonthly);
      case 'plPct15days': return this.num((r as any).plPct15days);
      case 'targetDeltaPct': return this.num(r.targetDeltaPct);

      default:
        return (r as any)?.[key] ?? r.tradingsymbol ?? null;
    }
  }

  private num(v: any): number | null {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private toDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }

  // UI helpers
  plClass(r: SwingGroupPosition): 'pos' | 'neg' | 'neu' {
    const v = r.pl ?? 0;
    if (v > 0) return 'pos';
    if (v < 0) return 'neg';
    return 'neu';
  }

  openChart(symbol: string) {
    const sym = (symbol || '').trim().toUpperCase();
    if (!sym) return;

    this.router.navigate(['/returns/chart', sym], {
      queryParams: { filter: 'ALL' }
    });
  }
}