import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../services/portfolio.service';
import { Holding } from '../../models/holding.model';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './watchlist.component.html',
  styleUrls: ['./watchlist.component.css']
})
export class WatchlistComponent {

  sortColumn: string = 'symbol';
  sortAsc = true;

  constructor(public portfolio: PortfolioService) {}

  get sortedWatchlist(): Holding[] {
    return [...this.portfolio.watchlist].sort((a, b) => {
      let valA: number | string;
      let valB: number | string;

      switch (this.sortColumn) {
        case 'price':
          valA = a.currentPrice;
          valB = b.currentPrice;
          break;
        default:
          valA = a.symbol;
          valB = b.symbol;
      }

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  sort(col: string) {
    if (this.sortColumn === col) this.sortAsc = !this.sortAsc;
    else {
      this.sortColumn = col;
      this.sortAsc = true;
    }
  }
}
