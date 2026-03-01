import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { KiteAuthService } from '../../services/kite-auth.service';
import { PriceSyncService } from '../../services/price-sync.service';
import { AddStockModalComponent } from '../stocks/add-stock-modal/add-stock-modal.component'; // adjust path

@Component({
  standalone: true,
  selector: 'app-main-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AddStockModalComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private auth = inject(KiteAuthService);
private priceSync = inject(PriceSyncService);

syncing = signal(false);
syncMsg = signal<string | null>(null);
syncErr = signal(false);


  loggedIn = computed(() => this.auth.loggedIn());

  constructor() {
    this.auth.checkAuthStatus();
  }

  // ✅ separate states
  menuOpen = signal(false);
  addStockOpen = signal(false);

  toggleMenu(ev?: Event) {
    ev?.stopPropagation();
    this.menuOpen.set(!this.menuOpen());
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  // ✅ open modal, not menu
  openAddStocks(ev?: Event) {
    ev?.stopPropagation();
    this.closeMenu();
    this.addStockOpen.set(true);
  }

  onAddStockClosed(saved: boolean) {
    this.addStockOpen.set(false);
  }

  startKiteLogin() {
    this.auth.startKiteLogin(this.router.url);
  }
   
  syncHistoricalPrices(ev?: Event) {
  ev?.stopPropagation();
  this.closeMenu();

  if (this.syncing()) return;

  this.syncErr.set(false);
  this.syncMsg.set('Syncing historical prices…');
  this.syncing.set(true);

  this.priceSync.syncHistorical().subscribe({
    next: () => {
      this.syncing.set(false);
      this.syncErr.set(false);
      this.syncMsg.set('Historical price sync triggered successfully.');
      // auto-hide after a bit
      setTimeout(() => this.syncMsg.set(null), 3500);
    },
    error: (err) => {
      this.syncing.set(false);
      this.syncErr.set(true);
      const msg = err?.error?.message || err?.error || err?.message || 'Sync failed';
      this.syncMsg.set(String(msg));
      setTimeout(() => this.syncMsg.set(null), 6000);
    }
  });
}
  
}