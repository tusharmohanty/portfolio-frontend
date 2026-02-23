import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioService } from '../../services/portfolio.service';
import { WatchlistItem } from '../../models/watchlist.model';

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


  sort(col: string) {
    if (this.sortColumn === col) this.sortAsc = !this.sortAsc;
    else {
      this.sortColumn = col;
      this.sortAsc = true;
    }
  }
}
