import { Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { SwingTradeService } from '../../services/swing-trade.service';
import {
  SwingGroupPosition,
  SwingSortKey,
  SwingStatusFilter,
  SortDir
} from '../../models/swing-group-position.model';

@Component({
  selector: 'app-swing-trade-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DecimalPipe, DatePipe],
  templateUrl: './swing-trade-groups.component.html',
  styleUrls: ['./swing-trade-groups.component.css'],
})
export class SwingTradeGroupsComponent {
  isMobile = signal(window.matchMedia('(max-width: 820px)').matches);

  status = signal<SwingStatusFilter>('OPEN');
  sortKey = signal<SwingSortKey>('updatedAt');
  sortDir = signal<SortDir>('desc');
  symbolFilter = signal('');

  loading = signal(false);
  error = signal<string | null>(null);
  allRows = signal<SwingGroupPosition[]>([]);

  sortOptions: { key: SwingSortKey; label: string }[] = [
    { key: 'updatedAt', label: 'Updated' },
    { key: 'openedAt', label: 'Entry' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'pl', label: 'P/L' },
    { key: 'plPct', label: '% P/L' },
    { key: 'positionSize', label: 'Pos Size' },
    { key: 'plPctDaily', label: '% PL Day' },
    { key: 'plPctWeekly', label: '% PL Week' },
    { key: 'plPctMonthly', label: '% PL Month' },
    { key: 'plPct15days', label: '% PL 15 Days' },
    { key: 'targetDeltaPct', label: '% Delta vs Target' },
    { key: 'holdingPeriodDays', label: 'Holding Period' },
  ];

  constructor(
    private router: Router,
    private api: SwingTradeService
  ) {
    const mq = window.matchMedia('(max-width: 820px)');
    mq.addEventListener('change', e => this.isMobile.set(e.matches));
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.getGroups('ALL', 'updatedAt', 'desc').subscribe({
      next: (data: SwingGroupPosition[]) => {
        this.allRows.set(data ?? []);
        this.loading.set(false);
      },
      error: (err: any) => {
        console.error(err);
        this.error.set(err?.error?.message ?? err?.message ?? 'Failed to load swing groups');
        this.loading.set(false);
      }
    });
  }

  readonly visibleRows = computed(() => {
    const st = this.status();
    const sym = this.symbolFilter().trim().toUpperCase();
    let rows = [...this.allRows()];

    if (st !== 'ALL') {
      rows = rows.filter(r => (r.status || '').toUpperCase() === st);
    }

    if (sym) {
      rows = rows.filter(r => (r.symbol || '').toUpperCase().includes(sym));
    }

    return rows;
  });

  readonly viewRows = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const rows = [...this.visibleRows()];
    const factor = dir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      const va = this.sortValue(a, key);
      const vb = this.sortValue(b, key);

      const aNil = va === null || va === undefined || (typeof va === 'number' && Number.isNaN(va));
      const bNil = vb === null || vb === undefined || (typeof vb === 'number' && Number.isNaN(vb));

      if (aNil && bNil) return 0;
      if (aNil) return 1;
      if (bNil) return -1;

      if (typeof va === 'number' && typeof vb === 'number') {
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * factor;
      }

      if (va instanceof Date && vb instanceof Date) {
        const ta = va.getTime();
        const tb = vb.getTime();
        if (ta === tb) return 0;
        return (ta < tb ? -1 : 1) * factor;
      }

      const sa = String(va).toUpperCase();
      const sb = String(vb).toUpperCase();
      if (sa === sb) return 0;
      return (sa < sb ? -1 : 1) * factor;
    });

    return rows;
  });

  readonly summary = computed(() => {
    const visible = this.visibleRows();
    const inv = visible.reduce((s, r) => s + (Number(r.positionSize ?? 0) || 0), 0);
    const pl = visible.reduce((s, r) => s + (Number(r.pl ?? 0) || 0), 0);
    const plPct = inv !== 0 ? (pl / inv) * 100 : 0;

    return {
      count: visible.length,
      inv,
      pl,
      plPct
    };
  });

  setSort(key: SwingSortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'symbol' ? 'asc' : 'desc');
    }
  }

  toggleSortDir(): void {
    this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
  }

  onStatusChange(v: any): void {
    const next = String(v || 'ALL').toUpperCase() as SwingStatusFilter;
    this.status.set(next);
  }

  plClass(r: SwingGroupPosition): 'pos' | 'neg' | 'neu' {
    const v = r.pl ?? 0;
    if (v > 0) return 'pos';
    if (v < 0) return 'neg';
    return 'neu';
  }

  openChart(symbol: string): void {
    const sym = (symbol || '').trim().toUpperCase();
    if (!sym) return;
    this.router.navigate(['/returns/chart', sym], {
      queryParams: { filter: 'ALL' }
    });
  }

  private sortValue(r: SwingGroupPosition, key: SwingSortKey): number | string | Date | null {
    switch (key) {
      case 'openedAt':
        return this.toDate(r.openedAt);
      case 'updatedAt':
        return this.toDate(r.updatedAt);
      case 'symbol':
        return r.symbol ?? '';
      case 'pl':
        return this.num(r.pl);
      case 'positionSize':
        return this.num(r.positionSize);
      case 'holdingPeriodDays':
        return this.num(r.holdingPeriodDays);
      case 'plPct':
        return this.num(r.plPct);
      case 'plPctDaily':
        return this.num(r.plPctDaily);
      case 'plPctWeekly':
        return this.num(r.plPctWeekly);
      case 'plPctMonthly':
        return this.num(r.plPctMonthly);
      case 'plPct15days':
        return this.num(r.plPct15days);
      case 'targetDeltaPct':
        return this.num(r.targetDeltaPct);
      default:
        return null;
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
}