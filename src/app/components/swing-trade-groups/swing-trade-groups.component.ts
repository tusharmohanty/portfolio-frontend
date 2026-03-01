import { Component, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwingTradeService } from '../../services/swing-trade.service';
import { SwingGroupPosition, SwingSortKey, SwingStatusFilter, SortDir } from '../../models/swing-group-position.model';
import { HttpClient } from '@angular/common/http';

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

  status = signal<SwingStatusFilter>('OPEN');
  sortKey = signal<SwingSortKey>('updatedAt');
  sortDir = signal<SortDir>('desc');

  loading = signal(false);
  error = signal<string | null>(null);
  rows = signal<SwingGroupPosition[]>([]);

  expanded = signal<Set<number>>(new Set());

  loggedIn = signal(false);

  // Aggregates SHOULD follow the current filter selection (OPEN/CLOSED/ALL)
  summary = computed(() => {
    const st = this.status();
    const visible =
      st === 'ALL'
        ? this.rows()
        : this.rows().filter(r => r.status === st);

    const inv = visible.reduce((s, r) => s + (Number(r.positionSize ?? 0) || 0), 0);
    const pl = visible.reduce((s, r) => s + (Number(r.pl ?? 0) || 0), 0);
    const plPct = inv !== 0 ? (pl / inv) * 100 : 0;

    return { count: visible.length, inv, pl, plPct };
  });

  sortOptions: { key: SwingSortKey; label: string }[] = [
    { key: 'updatedAt', label: 'Updated' },
    { key: 'plPct', label: '% P/L' },
    { key: 'plPctDaily', label: '% PL Day' },
    { key: 'plPctWeekly', label: '% PL Week' },
    { key: 'plPctMonthly', label: '% PL Monthly' },
    { key: 'plPct15days', label: '% PL 15 Days' },
    { key: 'targetDeltaPct', label: '% Delta vs Target' },
    { key: 'holdingPeriodDays', label: 'Holding Period' },
  ];

  constructor(private api: SwingTradeService, private http: HttpClient) {
    const mq = window.matchMedia('(max-width: 820px)');
    mq.addEventListener('change', e => this.isMobile.set(e.matches));

    this.checkKiteAuth();
    this.load();
  }

  checkKiteAuth() {
    // returns 200 text token OR 409 JSON
    this.http.get('/auth/kite/token', { responseType: 'text' }).subscribe({
      next: (token: string) => {
        this.loggedIn.set(!!token && token.trim().length > 10);
      },
      error: () => {
        // 409 = login required
        this.loggedIn.set(false);
      }
    });
  }

  startKiteLogin() {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth/kite/login?returnTo=${returnTo}`;
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.api.getGroups(this.status(), this.sortKey(), this.sortDir()).subscribe({
      next: (data: SwingGroupPosition[]) => {
        this.rows.set(data ?? []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message ?? 'Failed to load swing groups');
        this.loading.set(false);
      }
    });
  }

  toggleExpand(id: number) {
    const s = new Set(this.expanded());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expanded.set(s);
  }

  setSort(key: SwingSortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
    this.load();
  }

  // UI helpers
  plClass(r: SwingGroupPosition): 'pos' | 'neg' | 'neu' {
    const v = r.pl ?? 0;
    if (v > 0) return 'pos';
    if (v < 0) return 'neg';
    return 'neu';
  }

  fmtNum(v: number | null | undefined): string {
    return v === null || v === undefined || Number.isNaN(v) ? '—' : String(v);
  }

  onStatusChange(v: any) {
  console.log('STATUS CHANGE ->', v);
  this.status.set(v);
  this.load();
}

dateRangeLabel(g: any): string {
  const start = g?.openedAt ? new Date(g.openedAt) : null;
  const isClosed = (g?.status || '').toUpperCase() === 'CLOSED';
  const end = (isClosed && g?.closedAt) ? new Date(g.closedAt) : null;

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  if (!start) return '—';
  if (end) return `${fmt(start)} - ${fmt(end)}`;
  return `${fmt(start)} - Present`;
}
}