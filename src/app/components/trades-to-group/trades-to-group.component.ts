import { Component, computed, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { TradesService } from '../../services/trades.service';
import { SwingTradeService } from '../../services/swing-trade.service';
import { KiteTrade } from '../../models/kite-trade.model';
import { CreateSwingGroupRequest } from '../../models/swing-group-requests.model';
import { SwingGroupPosition } from '../../models/swing-group-position.model';
import { InvestmentsService } from '../../services/investments.service';

@Component({
  selector: 'app-trades-to-group',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './trades-to-group.component.html',
  styleUrls: ['./trades-to-group.component.css'],
})
export class TradesToGroupComponent {
  loading = signal(false);
  error = signal<string | null>(null);

  trades = signal<KiteTrade[]>([]);
  q = signal('');

  selected = signal<Set<number>>(new Set());

  // unified assign drawer
  showAssignDrawer = signal(false);
  assignError = signal<string | null>(null);

  // create-new section state
  creating = signal(false);
  createError = signal<string | null>(null);

  // existing-group section state
  loadingGroups = signal(false);
  addingToGroup = signal(false);
  openGroups = signal<SwingGroupPosition[]>([]);
  selectedGroupId = signal<number | null>(null);

  sortField = signal<'time' | 'symbol' | null>('time');
  sortDir = signal<'asc' | 'desc'>('desc');

  form = signal<CreateSwingGroupRequest>({
    tradingsymbol: '',
    exchange: 'NSE',
    thesisTitle: '',
    thesisNotes: '',
    strategyTag: 'INTUTION',
    timeframe: 'SWING',
  });

  filtered = computed(() => {
    const s = (this.q() || '').trim().toUpperCase();
    let rows = this.trades();

    if (s) {
      rows = rows.filter(t => (t.tradingsymbol || '').toUpperCase().includes(s));
    }

    const field = this.sortField();
    const dir = this.sortDir();
    if (!field) return rows;

    return [...rows].sort((a, b) => {
      let v1: number | string = 0;
      let v2: number | string = 0;

      if (field === 'time') {
        v1 = a.tradeTimestamp ? new Date(a.tradeTimestamp).getTime() : 0;
        v2 = b.tradeTimestamp ? new Date(b.tradeTimestamp).getTime() : 0;
      } else if (field === 'symbol') {
        v1 = (a.tradingsymbol || '').toUpperCase();
        v2 = (b.tradingsymbol || '').toUpperCase();
      }

      if (v1 < v2) return dir === 'asc' ? -1 : 1;
      if (v1 > v2) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  });

  selectedCount = computed(() => this.selected().size);

  selectionSummary = computed(() => {
    const ids = this.selected();
    const rows = this.trades().filter(t => ids.has(t.id));
    const symbols = new Set(rows.map(r => r.tradingsymbol).filter(Boolean) as string[]);
    const exchs = new Set(rows.map(r => r.exchange).filter(Boolean) as string[]);

    return {
      rows,
      singleSymbol: symbols.size === 1 ? [...symbols][0] : null,
      singleExchange: exchs.size === 1 ? [...exchs][0] : null,
    };
  });

  selectedTrades = computed(() => {
    const ids = this.selected();
    return this.trades().filter(t => ids.has(t.id));
  });

  selectedSymbol = computed(() => {
    const symbols = [
      ...new Set(
        this.selectedTrades()
          .map(t => (t.tradingsymbol || '').trim())
          .filter(Boolean)
          .map(s => s.toUpperCase())
      )
    ];
    return symbols.length === 1 ? symbols[0] : '';
  });

  canAssignToExistingGroup = computed(() => {
    const rows = this.selectedTrades();
    if (!rows.length) return false;

    const symbols = new Set(
      rows
        .map(t => (t.tradingsymbol || '').trim().toUpperCase())
        .filter(Boolean)
    );

    return symbols.size === 1;
  });

  matchingOpenGroups = computed(() => {
    const symbol = this.selectedSymbol();
    if (!symbol) return [];

    return this.openGroups().filter(g =>
      g.status === 'OPEN' &&
      (g.tradingsymbol || '').trim().toUpperCase() === symbol
    );
  });

  selectedQty = computed(() => {
    const ids = this.selected();
    return this.trades()
      .filter(t => ids.has(t.id))
      .reduce((sum, t) => sum + (t.quantity ?? 0), 0);
  });

  selectedQtyBreakup = computed(() => {
    const ids = this.selected();
    let buy = 0;
    let sell = 0;

    for (const t of this.trades()) {
      if (!ids.has(t.id)) continue;

      const q = t.quantity ?? 0;
      const side = (t.transactionType || '').toUpperCase();

      if (side === 'BUY') buy += q;
      else if (side === 'SELL') sell += q;
    }

    return { buy, sell, net: buy - sell };
  });

  constructor(
    private tradesApi: TradesService,
    private swingApi: SwingTradeService,
    private invstApi: InvestmentsService
  ) {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.tradesApi.getAllTrades().subscribe({
      next: (data: KiteTrade[]) => {
        this.trades.set(data ?? []);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.message ?? 'Failed to load trades');
        this.loading.set(false);
      },
    });
  }

  toggleSort(field: 'time' | 'symbol') {
    if (this.sortField() === field) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set(field === 'symbol' ? 'asc' : 'desc');
    }
  }

  toggle(id: number) {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }

  toggleAllVisible() {
    const vis = this.filtered();
    const s = new Set(this.selected());
    const allSelected = vis.length > 0 && vis.every(t => s.has(t.id));

    if (allSelected) vis.forEach(t => s.delete(t.id));
    else vis.forEach(t => s.add(t.id));

    this.selected.set(s);
  }

  clearSelection() {
    this.selected.set(new Set());
  }

  side(t: KiteTrade): 'BUY' | 'SELL' | '—' {
    const v = (t.transactionType || '').toUpperCase();
    if (v === 'BUY' || v === 'SELL') return v;
    return '—';
  }

  openAssignDrawer() {
    const sum = this.selectionSummary();
    const f = { ...this.form() };

    if (sum.singleSymbol) f.tradingsymbol = sum.singleSymbol;
    if (sum.singleExchange) f.exchange = sum.singleExchange;

    this.form.set(f);

    this.assignError.set(null);
    this.createError.set(null);
    this.selectedGroupId.set(null);
    this.openGroups.set([]);
    this.showAssignDrawer.set(true);

    if (this.canAssignToExistingGroup()) {
      this.loadMatchingOpenGroups();
    }
  }

  closeAssignDrawer() {
    this.showAssignDrawer.set(false);
    this.assignError.set(null);
    this.createError.set(null);
    this.selectedGroupId.set(null);
  }

  loadMatchingOpenGroups() {
  const symbol = this.selectedSymbol();
  if (!symbol) {
    this.assignError.set('Could not determine selected symbol.');
    return;
  }

  this.loadingGroups.set(true);
  this.assignError.set(null);

  this.swingApi.getGroups('OPEN', 'updatedAt', 'desc', symbol)
    .pipe(finalize(() => this.loadingGroups.set(false)))
    .subscribe({
      next: (groups: SwingGroupPosition[]) => {
        this.openGroups.set(groups ?? []);
        const matches = this.matchingOpenGroups();
        if (matches.length === 1) {
          this.selectedGroupId.set(matches[0].id);
        }
      },
      error: (err: any) => {
        console.error(err);
        this.assignError.set(err?.error ?? err?.message ?? 'Failed to load matching open groups');
      }
    });
}

  createGroupAndAttach() {
    const ids = [...this.selected()];
    if (ids.length === 0) {
      this.createError.set('Select at least one trade');
      return;
    }

    const f = this.form();
    if (!f.tradingsymbol || !f.exchange) {
      this.createError.set('tradingsymbol and exchange are required');
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.assignError.set(null);

    this.swingApi.createGroup(f).subscribe({
      next: (groupId: number) => {
        this.swingApi.addTradesToGroup(groupId, { kiteTradeIds: ids }).subscribe({
          next: () => {
            this.creating.set(false);
            this.showAssignDrawer.set(false);
            this.clearSelection();
            alert(`Group #${groupId}: added ${ids.length} trades`);
            this.load();
          },
          error: (err: any) => {
            this.creating.set(false);
            this.createError.set(err?.error ?? err?.message ?? 'Failed to add trades to group');
          },
        });
      },
      error: (err: any) => {
        this.creating.set(false);
        this.createError.set(err?.error ?? err?.message ?? 'Failed to create group');
      },
    });
  }

  addSelectedTradesToGroup() {
  const groupId = this.selectedGroupId();
  if (!groupId) {
    this.assignError.set('Please select a group.');
    return;
  }

  const kiteTradeIds = [...this.selected()];
  if (kiteTradeIds.length === 0) {
    this.assignError.set('Select at least one trade');
    return;
  }

  this.addingToGroup.set(true);
  this.assignError.set(null);

  this.swingApi.addTradesToGroup(groupId, { kiteTradeIds })
    .pipe(finalize(() => this.addingToGroup.set(false)))
    .subscribe({
      next: () => {
        this.closeAssignDrawer();
        this.clearSelection();
        alert(`Group #${groupId}: added ${kiteTradeIds.length} trades`);
        this.load();
      },
      error: (err: any) => {
        console.error(err);
        this.assignError.set(err?.error ?? err?.message ?? 'Failed to add trades to group');
      }
    });
}

  markSelectedAsCore() {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    this.invstApi.migrateBulk({ kiteTradeIds: ids, notes: 'CORE' }).subscribe({
      next: (res) => {
        const ok = res.filter(r => r.success).length;
        const fail = res.length - ok;
        alert(`Core marked: ${ok} ok${fail ? `, ${fail} failed` : ''}`);
        this.load();
      },
      error: (err) => alert(err?.error ?? err?.message ?? 'Failed to mark core'),
    });
  }

  removeSelectedFromCore() {
    const ids = [...this.selected()];
    if (ids.length === 0) return;

    let ok = 0, fail = 0, done = 0;

    ids.forEach(id => {
      this.invstApi.unmigrateOne(id).subscribe({
        next: () => {
          ok++;
          done++;
          if (done === ids.length) this.afterCoreUpdate(ok, fail);
        },
        error: () => {
          fail++;
          done++;
          if (done === ids.length) this.afterCoreUpdate(ok, fail);
        },
      });
    });
  }

  private afterCoreUpdate(ok: number, fail: number) {
    alert(`Core removed: ${ok} ok${fail ? `, ${fail} failed` : ''}`);
    this.load();
  }
}