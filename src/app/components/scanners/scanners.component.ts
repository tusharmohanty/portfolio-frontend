import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ScannerService } from '../../services/scanner.service';
import {
  ScanResult, ScanDefinition, ScanResultRow, ScanColumn,
  ScanRuleEvaluation, TierKey, ColumnType, RuleOperator,
} from '../../models/scanner.model';

@Component({
  selector: 'app-scanners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scanners.component.html',
  styleUrl: './scanners.component.css',
})
export class ScannersComponent {
  private svc    = inject(ScannerService);
  private router = inject(Router);

  definitions = signal<ScanDefinition[]>([]);
  result      = signal<ScanResult | null>(null);
  loading     = signal(false);
  error       = signal<string | null>(null);
  selectedId  = signal<string>('');

  /** Columns excluding IDENTITY (rendered separately) and SCORE (rendered separately) */
  midColumns = computed(() =>
    (this.result()?.columns ?? []).filter(
      c => c.role !== 'IDENTITY' && c.role !== 'SCORE'
    )
  );

  scoreColumn = computed(() =>
    (this.result()?.columns ?? []).find(c => c.role === 'SCORE') ?? null
  );

  /** Tiers that actually have results */
  activeTiers = computed(() =>
    (this.result()?.tiers ?? []).filter(t => t.count > 0)
  );

  /** classifier rules grouped by tier for the legend */
  rulesByTier = computed(() => {
    const rules = this.result()?.classifierRules ?? [];
    const map = new Map<TierKey, typeof rules>();
    for (const r of rules) {
      if (!map.has(r.tier)) map.set(r.tier, []);
      map.get(r.tier)!.push(r);
    }
    return map;
  });

  constructor() {
    this.svc.getScanDefinitions().subscribe({
      next: defs => {
        this.definitions.set(defs);
        if (defs.length > 0) this.runScan(defs[0].id);
      },
      error: err => this.error.set(err?.message ?? 'Failed to load scan list.'),
    });
  }

  onScanChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.runScan(id);
  }

  runScan(id: string): void {
    this.selectedId.set(id);
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.svc.runScan(id).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: err => { this.error.set(err?.message ?? 'Scan failed.'); this.loading.set(false); },
    });
  }

  rowsForTier(tier: TierKey): ScanResultRow[] {
    return (this.result()?.results ?? []).filter(r => r.tier === tier);
  }

  /** Return all tier_attribution entries relevant to a specific column */
  attributionFor(row: ScanResultRow, columnKey: string): ScanRuleEvaluation | null {
    return row.tier_attribution?.find(a => a.columnKey === columnKey) ?? null;
  }

  /** Classifier columns (those that appear in classifierRules) */
  classifierKeys = computed(() =>
    new Set((this.result()?.classifierRules ?? []).map(r => r.columnKey))
  );

  openChart(symbol: string): void {
    this.router.navigate(['/returns/chart', symbol]);
  }

  // ── Formatting ──────────────────────────────────────────────────────────────

  formatValue(value: unknown, type: ColumnType): string {
    if (value == null) return '—';
    const n = Number(value);
    if (isNaN(n)) return String(value);
    switch (type) {
      case 'PRICE':   return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'PERCENT': return n.toFixed(2) + '%';
      case 'RATIO':   return n.toFixed(2) + 'x';
      case 'NUMBER':  return (n >= 0 ? '+' : '') + n.toFixed(2);
      case 'DATE':    return String(value);
      default:        return String(value);
    }
  }

  formatThreshold(threshold: number, type: ColumnType): string {
    switch (type) {
      case 'PRICE':   return '₹' + threshold.toLocaleString('en-IN');
      case 'PERCENT': return threshold + '%';
      case 'RATIO':   return threshold + 'x';
      default:        return String(threshold);
    }
  }

  operatorLabel(op: RuleOperator): string {
    return { LT: '<', LTE: '≤', GT: '>', GTE: '≥' }[op];
  }

  /** Highlight class for a value given column highlight direction */
  highlightClass(value: unknown, col: ScanColumn): string {
    if (col.highlight === 'NONE') return '';
    const n = Number(value);
    if (isNaN(n)) return '';
    if (col.highlight === 'HIGH') return n >= 0 ? 'pos' : 'neg';
    if (col.highlight === 'LOW')  return n <= 0.8 ? 'pos' : n >= 1.2 ? 'neg' : '';
    return '';
  }

  tierCssClass(tier: TierKey): string {
    return { CONFIRMED: 'confirmed', WATCH: 'watch', CAUTION: 'caution' }[tier];
  }

  columnLabel(columns: ScanColumn[], key: string): string {
    return columns.find(c => c.key === key)?.label ?? key;
  }

  columnType(columns: ScanColumn[], key: string): ColumnType {
    return columns.find(c => c.key === key)?.type ?? 'NUMBER';
  }
}
