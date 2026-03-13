import { Component, computed, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';

interface ClosedSwingReportSummaryDto {
  from: string;
  to: string;
  allCombinedPl: number;
  buyValue: number;
  sellValue: number;
  charges: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

interface ClosedSwingReportRowDto {
  groupId: number;
  symbol: string;
  exchange: string;
  thesisTitle: string;
  strategyTag?: string;
  timeframe?: string;
  status: string;
  openedAt?: string;
  closedAt?: string;
  holdingDays?: number;
  qty: number;
  buyValue: number;
  sellValue: number;
  charges: number;
  netPl: number;
  plPct: number;
  win: boolean;
}

interface ClosedSwingMonthlyBreakdownDto {
  monthKey: string;
  monthLabel: string;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  buyValue: number;
  sellValue: number;
  charges: number;
  netPl: number;
  avgPlPct: number;
}

type SortKey =
  | 'closedAt'
  | 'symbol'
  | 'netPl'
  | 'plPct'
  | 'buyValue'
  | 'sellValue'
  | 'holdingDays'
  | 'qty';

@Component({
  selector: 'app-closed-swing-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    DecimalPipe,
    DatePipe
  ],
  templateUrl: './closed-swing-report.component.html',
  styleUrls: ['./closed-swing-report.component.css']
})
export class ClosedSwingReportComponent {
  loading = signal(false);
  error = signal<string | null>(null);

  from = signal(this.firstDayOfCurrentMonth());
  to = signal(this.today());

  summary = signal<ClosedSwingReportSummaryDto>({
    from: this.firstDayOfCurrentMonth(),
    to: this.today(),
    allCombinedPl: 0,
    buyValue: 0,
    sellValue: 0,
    charges: 0,
    tradeCount: 0,
    winCount: 0,
    lossCount: 0
  });

  rows = signal<ClosedSwingReportRowDto[]>([]);
  monthly = signal<ClosedSwingMonthlyBreakdownDto[]>([]);

  sortKey = signal<SortKey>('closedAt');
  sortDir = signal<'asc' | 'desc'>('desc');

  readonly viewRows = computed(() => {
    const rows = [...this.rows()];
    const key = this.sortKey();
    const dir = this.sortDir();
    const factor = dir === 'asc' ? 1 : -1;

    return rows.sort((a, b) => {
      const av = this.getSortValue(a, key);
      const bv = this.getSortValue(b, key);

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * factor;
      }

      const diff = Number(av) - Number(bv);
      return (diff > 0 ? 1 : diff < 0 ? -1 : 0) * factor;
    });
  });

  readonly totalQty = computed(() =>
    this.rows().reduce((sum, row) => sum + Number(row.qty || 0), 0)
  );

  readonly totalBuyValue = computed(() =>
    this.rows().reduce((sum, row) => sum + Number(row.buyValue || 0), 0)
  );

  readonly totalSellValue = computed(() =>
    this.rows().reduce((sum, row) => sum + Number(row.sellValue || 0), 0)
  );

  readonly totalCharges = computed(() =>
    this.rows().reduce((sum, row) => sum + Number(row.charges || 0), 0)
  );

  readonly totalNetPl = computed(() =>
    this.rows().reduce((sum, row) => sum + Number(row.netPl || 0), 0)
  );

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    Promise.all([
      this.loadSummary(),
      this.loadTrades(),
      this.loadMonthly()
    ])
      .then(() => this.loading.set(false))
      .catch((err) => {
        console.error(err);
        this.error.set(err?.message || 'Failed to load closed swing report');
        this.loading.set(false);
      });
  }

  async loadSummary(): Promise<void> {
    const params = new HttpParams()
      .set('from', this.from())
      .set('to', this.to());

    const res = await this.http
      .get<ClosedSwingReportSummaryDto>('/api/swing-v2/reports/closed-summary', { params })
      .toPromise();

    this.summary.set(res ?? {
      from: this.from(),
      to: this.to(),
      allCombinedPl: 0,
      buyValue: 0,
      sellValue: 0,
      charges: 0,
      tradeCount: 0,
      winCount: 0,
      lossCount: 0
    });
  }

  async loadTrades(): Promise<void> {
    const params = new HttpParams()
      .set('from', this.from())
      .set('to', this.to());

    const res = await this.http
      .get<ClosedSwingReportRowDto[]>('/api/swing-v2/reports/closed-trades', { params })
      .toPromise();

    this.rows.set(res ?? []);
  }

  async loadMonthly(): Promise<void> {
    const params = new HttpParams()
      .set('from', this.from())
      .set('to', this.to());

    const res = await this.http
      .get<ClosedSwingMonthlyBreakdownDto[]>('/api/swing-v2/reports/closed-monthly', { params })
      .toPromise();

    this.monthly.set(res ?? []);
  }

  applyFilters(): void {
    this.load();
  }

  resetToCurrentMonth(): void {
    this.from.set(this.firstDayOfCurrentMonth());
    this.to.set(this.today());
    this.load();
  }

  setThisMonth(): void {
    this.from.set(this.firstDayOfCurrentMonth());
    this.to.set(this.today());
    this.load();
  }

  setYtd(): void {
    const d = new Date();
    this.from.set(this.toDateInput(new Date(d.getFullYear(), 0, 1)));
    this.to.set(this.today());
    this.load();
  }

  sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set(key === 'symbol' ? 'asc' : 'desc');
    }
  }

  badgeClass(value: number | null | undefined): string {
    if ((value ?? 0) > 0) return 'pos';
    if ((value ?? 0) < 0) return 'neg';
    return 'flat';
  }

  trackByGroupId = (_: number, row: ClosedSwingReportRowDto) => row.groupId;
  trackByMonth = (_: number, row: ClosedSwingMonthlyBreakdownDto) => row.monthKey;

  private getSortValue(row: ClosedSwingReportRowDto, key: SortKey): string | number | null {
    switch (key) {
      case 'closedAt':
        return row.closedAt ? new Date(row.closedAt).getTime() : null;
      case 'symbol':
        return row.symbol ?? '';
      case 'netPl':
        return row.netPl ?? 0;
      case 'plPct':
        return row.plPct ?? 0;
      case 'buyValue':
        return row.buyValue ?? 0;
      case 'sellValue':
        return row.sellValue ?? 0;
      case 'holdingDays':
        return row.holdingDays ?? 0;
      case 'qty':
        return row.qty ?? 0;
      default:
        return 0;
    }
  }

  private today(): string {
    return this.toDateInput(new Date());
  }

  private firstDayOfCurrentMonth(): string {
    const d = new Date();
    return this.toDateInput(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  private toDateInput(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}