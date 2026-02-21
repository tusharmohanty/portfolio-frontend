import { Component, OnInit,ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CorePortfolioService } from '../../services/core-portfolio.service';
import { CorePeriod, CorePosition, CorePositionUi } from '../../models/core-position.model';
import { finalize } from 'rxjs/operators';

type SortKey = keyof CorePositionUi;

@Component({
  selector: 'app-core-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './core-portfolio.component.html',
  styleUrls: ['./core-portfolio.component.css'],
})
export class CorePortfolioComponent implements OnInit {
  loading = true;
  error: string | null = null;

  period: CorePeriod = '1W';

  raw: CorePosition[] = [];
  positions: CorePositionUi[] = [];
  expanded = new Set<string>();

  // simple sort
  sortKey: SortKey = 'currentValue';
  sortDir: 'asc' | 'desc' = 'desc';

  // computed totals
  totalInvestment = 0;
  totalCurrentValue = 0;
  totalPl = 0;

  overallPeriodPnl = 0;
  overallPeriodPct = 0;

  constructor(private coreSvc: CorePortfolioService,
  private cdr: ChangeDetectorRef,
  private zone: NgZone) {}

  ngOnInit(): void {
  this.loading = true;
  this.error = null;

  this.coreSvc.getPositions()
    .pipe(
      finalize(() => {
        // ensure UI updates
        this.loading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe({
      next: (data: CorePosition[]) => {
        // run inside Angular zone to trigger CD even in some zoneless-ish setups
        this.zone.run(() => {
          this.raw = data ?? [];
          this.recompute();
          this.cdr.detectChanges();
        });
      },
      error: (e: unknown) => {
        this.zone.run(() => {
          this.error = 'Failed to load core positions.';
          console.error(e);
          this.cdr.detectChanges();
        });
      },
    });
}

  setPeriod(p: CorePeriod) {
    this.period = p;
    this.recomputePeriodTotals();
  }

  toggleExpand(symbol: string) {
    if (this.expanded.has(symbol)) this.expanded.delete(symbol);
    else this.expanded.add(symbol);
  }

  setSort(key: SortKey) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
    } else {
      this.sortKey = key;
      this.sortDir = 'desc';
    }
    this.sortPositions();
  }
  


  private recompute() {
    // totals
    this.totalInvestment = this.sum(this.raw, (x) => x.totalInvestment);
    this.totalCurrentValue = this.sum(this.raw, (x) => x.currentValue);
    this.totalPl = this.sum(this.raw, (x) => x.pl);

    // ui enrich
    const invDen = this.totalInvestment || 1;
    const valDen = this.totalCurrentValue || 1;

    this.positions = this.raw.map((p) => {
      const invWtPct = (p.totalInvestment / invDen) * 100;
      const valWtPct = (p.currentValue / valDen) * 100;
      const driftPct = valWtPct - invWtPct;
      return { ...p, invWtPct, valWtPct, driftPct };
    });

    this.recomputePeriodTotals();
    this.sortPositions();
  }

  private recomputePeriodTotals() {
    // pnl sum (easy)
    this.overallPeriodPnl = this.sum(this.positions, (p) => this.getPeriodPnl(p));

    // pct: use consistent denominator
    // 1D: denominator is prevClose * qty (portfolio previous close value)
    // 1W/1M: denominator is (currentValue - periodPnl) ≈ start-of-period value
    let denom = 0;

    if (this.period === '1D') {
      denom = this.sum(this.positions, (p) => (p.prevClose ?? 0) * (p.quantity ?? 0));
    } else {
      denom = this.sum(this.positions, (p) => (p.currentValue ?? 0) - this.getPeriodPnl(p));
    }

    this.overallPeriodPct = denom ? (this.overallPeriodPnl / denom) * 100 : 0;
  }

  getPeriodLabel(): string {
    return this.period === '1D' ? 'Day' : this.period === '1W' ? 'Week' : 'Month';
  }

  getPeriodPnl(p: CorePosition): number {
    return this.period === '1D' ? p.dayPnl : this.period === '1W' ? p.weekPnl : p.monthPnl;
  }

  getPeriodPct(p: CorePosition): number {
    return this.period === '1D' ? p.dayPnlPct : this.period === '1W' ? p.weekPnlPct : p.monthPnlPct;
  }

  get totalPlPct(): number {
    return this.totalInvestment ? (this.totalPl / this.totalInvestment) * 100 : 0;
  }

  private sortPositions() {
    const dir = this.sortDir === 'desc' ? -1 : 1;
    this.positions = [...this.positions].sort((a, b) => {
      const av = this.valueForSort(a, this.sortKey);
      const bv = this.valueForSort(b, this.sortKey);

      // string compare for symbol
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir;
      }

      const an = Number(av) || 0;
      const bn = Number(bv) || 0;
      return (an - bn) * dir;
    });
  }

  private valueForSort(p: CorePositionUi, k: SortKey): number | string {
  const v = p[k];
  return typeof v === 'string' ? v : Number(v ?? 0);
}

  private sum<T>(arr: T[], fn: (x: T) => number): number {
    let s = 0;
    for (const x of arr) s += Number(fn(x) ?? 0);
    return s;
  }

  formatSign(n: number): string {
    return n > 0 ? '+' : n < 0 ? '−' : '';
  }
}