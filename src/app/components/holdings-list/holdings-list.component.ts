import { Component } from '@angular/core';
import { PortfolioService } from '../../services/portfolio.service';
import { Holding } from '../../models/holding.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-holdings-list',
  standalone : true,
  imports: [CommonModule],
  templateUrl: './holdings-list.component.html',
  styleUrls: ['./holdings-list.component.css']
})
export class HoldingsListComponent {

  sortColumn = 'symbol';
  sortAsc = true;

  constructor(public portfolio: PortfolioService) {}

  sort(col: string) {
    if (this.sortColumn === col) this.sortAsc = !this.sortAsc;
    else this.sortColumn = col;
  }

  get sortedHoldings(): Holding[] {
    const data = [...this.portfolio.getHoldings()];

    return data.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (this.sortColumn) {
        case 'investment':
          valA = this.portfolio.getInvestment(a);
          valB = this.portfolio.getInvestment(b);
          break;
        case 'current':
          valA = this.portfolio.getCurrentValue(a);
          valB = this.portfolio.getCurrentValue(b);
          break;
        case 'pl':
          valA = this.portfolio.getPLPercent(a);
          valB = this.portfolio.getPLPercent(b);
          break;
        default:
          valA = a.symbol;
          valB = b.symbol;
      }

      return this.sortAsc ? valA - valB || valA.localeCompare?.(valB) : valB - valA || valB.localeCompare?.(valA);
    });
  }
}
