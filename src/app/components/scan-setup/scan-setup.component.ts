import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScannerService } from '../../services/scanner.service';
import {
  ScanDefinition, ScanColumn, ScanClassifierRule, ScanTier, TierKey,
  ColumnType, ColumnRole, ColumnHighlight, RuleOperator,
} from '../../models/scanner.model';

@Component({
  selector: 'app-scan-setup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scan-setup.component.html',
  styleUrl: './scan-setup.component.css',
})
export class ScanSetupComponent {
  private svc = inject(ScannerService);

  definitions = signal<ScanDefinition[]>([]);
  selectedId  = signal<string>('');
  loading     = signal(true);
  error       = signal<string | null>(null);

  selected = computed(() =>
    this.definitions().find(d => d.id === this.selectedId()) ?? null
  );

  /** Classifier rules grouped by tier in display order */
  rulesByTier = computed((): Map<TierKey, ScanClassifierRule[]> => {
    const rules = this.selected()?.classifierRules ?? [];
    const map = new Map<TierKey, ScanClassifierRule[]>();
    const order: TierKey[] = ['CONFIRMED', 'WATCH', 'CAUTION'];
    for (const tier of order) {
      const tr = rules
        .filter((r: ScanClassifierRule) => r.tier === tier)
        .sort((a: ScanClassifierRule, b: ScanClassifierRule) => a.sortOrder - b.sortOrder);
      if (tr.length) map.set(tier, tr);
    }
    return map;
  });

  tierLabel = computed((): Map<TierKey, string> => {
    const map = new Map<TierKey, string>();
    for (const t of (this.selected()?.tiers ?? []) as ScanTier[]) map.set(t.key, t.label);
    return map;
  });

  constructor() {
    this.svc.getScanDefinitions().subscribe({
      next: defs => {
        this.definitions.set(defs);
        if (defs.length) this.selectedId.set(defs[0].id);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.message ?? 'Failed to load scan definitions.');
        this.loading.set(false);
      },
    });
  }

  onSelect(event: Event): void {
    this.selectedId.set((event.target as HTMLSelectElement).value);
  }

  // ── Formatting helpers ───────────────────────────────────────────────────

  operatorLabel(op: RuleOperator): string {
    return { LT: '<', LTE: '≤', GT: '>', GTE: '≥' }[op];
  }

  formatThreshold(threshold: number, col: ScanColumn | undefined): string {
    if (!col) return String(threshold);
    switch (col.type) {
      case 'PRICE':   return '₹' + threshold;
      case 'PERCENT': return threshold + '%';
      case 'RATIO':   return threshold + 'x';
      default:        return String(threshold);
    }
  }

  columnForKey(key: string): ScanColumn | undefined {
    return this.selected()?.columns.find(c => c.key === key);
  }

  tierCss(tier: TierKey): string {
    return { CONFIRMED: 'confirmed', WATCH: 'watch', CAUTION: 'caution' }[tier];
  }

  roleBadge(role: ColumnRole): string {
    const map: Record<ColumnRole, string> = {
      IDENTITY:  'Identity',
      PRICE:     'Price',
      INDICATOR: 'Indicator',
      SIGNAL:    'Signal',
      SCORE:     'Score',
    };
    return map[role];
  }

  highlightBadge(h: ColumnHighlight): string {
    return { HIGH: '↑ High', LOW: '↓ Low', NONE: '—' }[h];
  }

  typeLabel(t: ColumnType): string {
    return { PRICE: '₹ Price', PERCENT: '% Percent', RATIO: 'x Ratio', NUMBER: '# Number', TEXT: 'Text', DATE: 'Date' }[t];
  }
}
