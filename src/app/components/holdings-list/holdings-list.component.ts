import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit,ChangeDetectorRef } from '@angular/core';
import { HoldingsService } from '../../services/holdings.service';
import { Holding } from '../../models/holding.model';

type SortKey =
  | 'tradingsymbol'
  | 'invested'
  | 'pnl'
  | 'pnlPct'
  | 'lastPrice'
  | 'quantity'
  | 'wp'
  | 'wpDev';

type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-holdings-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './holdings-list.component.html',
  styleUrls: ['./holdings-list.component.css'],
})
export class HoldingsListComponent implements OnInit {
  holdings: any[] = [];
  filtered: any[] = [];

  // responsive
  isMobile = window.innerWidth <= 768;

  // sorting
  sortKey: SortKey = 'pnlPct';
  sortDir: SortDir = 'desc';
  sortSheetOpen = false;

  // thesis drawer
  thesisOpen = false;
  thesisSymbol: string | null = null;

  constructor(private holdingsService: HoldingsService,
              private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.holdingsService.getHoldings().subscribe({
      next: (data: Holding[] | any[]) => {
  console.log('Holdings API raw:', data);

  try {
    const arr = Array.isArray(data) ? data : [];
    this.holdings = arr.map((h: any) => {
      const qty = Number(h.quantity ?? 0);
      const avg = Number(h.averagePrice ?? 0);
      const ltp = Number(h.lastPrice ?? 0);

      const invested = qty * avg;
      const currValue = qty * ltp;

      const pnl = Number(h.pnl ?? (currValue - invested));
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

      const wp = Number(h.wp ?? 0);
      const wpDev = Number(h.wpDev ?? h.wpDeviation ?? 0);

      return { ...h, invested, currValue, pnl, pnlPct, wp, wpDev };
    });

    // ✅ IMPORTANT: set filtered even if sort breaks
    this.filtered = [...this.holdings];
    this.applySort();

    console.log('Holdings mapped:', this.holdings.length, 'Filtered:', this.filtered.length);
    this.cdr.detectChanges();
  } catch (e) {
    console.error('Mapping holdings failed:', e);
    this.holdings = Array.isArray(data) ? data : [];
    this.filtered = [...this.holdings];
  }
},
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= 768;
  }

  // -------- Sorting ----------
  setSort(key: SortKey) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = key === 'tradingsymbol' ? 'asc' : 'desc';
    }
    this.applySort();
  }

  applySort() {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const key = this.sortKey;

    const getVal = (h: any) => {
      switch (key) {
        case 'tradingsymbol': return String(h.tradingsymbol ?? '');
        case 'invested': return Number(h.invested ?? 0);
        case 'pnl': return Number(h.pnl ?? 0);
        case 'pnlPct': return Number(h.pnlPct ?? 0);
        case 'lastPrice': return Number(h.lastPrice ?? 0);
        case 'quantity': return Number(h.quantity ?? 0);
        case 'wp': return Number(h.wp ?? 0);
        case 'wpDev': return Number(h.wpDev ?? 0);
        default: return 0;
      }
    };

    this.filtered = [...this.holdings].sort((a, b) => {
      const av = getVal(a);
      const bv = getVal(b);

      if (typeof av === 'string' || typeof bv === 'string') {
        return dir * String(av).localeCompare(String(bv));
      }
      return dir * ((av as number) - (bv as number));
    });
  }

  // -------- Sort sheet ----------
  openSortSheet() { this.sortSheetOpen = true; }
  closeSortSheet() { this.sortSheetOpen = false; }

  sortLabel(): string {
    const map: Record<SortKey, string> = {
      tradingsymbol: 'Symbol',
      invested: 'Total Invested',
      pnl: 'P/L',
      pnlPct: 'P/L %',
      lastPrice: 'LTP',
      quantity: 'Qty',
      wp: 'WP',
      wpDev: 'Dev',
    };
    return `${map[this.sortKey]}${this.sortDir === 'asc' ? ' ↑' : ' ↓'}`;
  }

  isEmphasis(key: SortKey) {
    return this.sortKey === key;
  }

  // -------- Thesis drawer ----------
  openThesis(symbol: string) {
    this.thesisSymbol = symbol;
    this.thesisOpen = true;
  }

  closeThesis() {
    this.thesisOpen = false;
    this.thesisSymbol = null;
  }

  // -------- Formatting ----------
  money(n: number): string {
    if (!isFinite(n)) return '—';
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  num(n: number, digits = 2): string {
    if (!isFinite(n)) return '—';
    return Number(n).toFixed(digits);
  }

  signClass(n: number): string {
    if (!isFinite(n) || n === 0) return 'muted';
    return n > 0 ? 'pos' : 'neg';
  }
}