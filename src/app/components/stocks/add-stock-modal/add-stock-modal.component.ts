import { Component, EventEmitter, HostListener, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../../services/stock.service';

export type StockCreateRequest = {
  symbol: string;
  sector: string;
  holdingType?: string | null;
  exchange: string;
  instrument: string;
  instrumentToken?: number | null;
};

@Component({
  standalone: true,
  selector: 'app-add-stock-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-stock-modal.component.html',
  styleUrls: ['./add-stock-modal.component.css'],
})
export class AddStockModalComponent {
  private stockService = inject(StockService);

  @Input() open = false;
  @Output() closed = new EventEmitter<boolean>(); // true = saved, false = closed

  saving = signal(false);
  error = signal<string | null>(null);

  form: StockCreateRequest = {
    symbol: '',
    sector: '',
    holdingType: null,
    exchange: 'NSE',
    instrument: 'EQ',
    instrumentToken: null,
  };

  // ESC closes
  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.open) this.close(false);
  }

  // prevent backdrop click when clicking inside the modal
  stop(ev: MouseEvent) {
    ev.stopPropagation();
  }

  close(saved: boolean) {
    this.error.set(null);
    this.saving.set(false);
    this.open = false;
    this.closed.emit(saved);
  }

  normalizeSymbol() {
    this.form.symbol = (this.form.symbol || '').toUpperCase().trim();
  }

  async save() {
    this.error.set(null);

    // basic validation
    if (!this.form.symbol?.trim()) return this.error.set('Symbol is required');
    if (!this.form.sector?.trim()) return this.error.set('Sector is required');
    if (!this.form.exchange?.trim()) return this.error.set('Exchange is required');
    if (!this.form.instrument?.trim()) return this.error.set('Instrument is required');

    this.normalizeSymbol();
    this.saving.set(true);

    this.stockService.createStock(this.form).subscribe({
      next: () => {
        this.saving.set(false);
        // reset for next time
        this.form = {
          symbol: '',
          sector: '',
          holdingType: null,
          exchange: 'NSE',
          instrument: 'EQ',
          instrumentToken: null,
        };
        this.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        const msg =
          err?.error?.message ||
          err?.error ||
          err?.message ||
          'Save failed';
        this.error.set(String(msg));
      },
    });
  }
}