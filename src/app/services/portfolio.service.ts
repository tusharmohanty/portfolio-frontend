import { Injectable } from '@angular/core';
import { Holding } from '../models/holding.model';

@Injectable({ providedIn: 'root' })
export class PortfolioService {

  holdings: Holding[] = [
    { symbol: 'RELIANCE', quantity: 10, avgPrice: 2500, currentPrice: 2800 },
    { symbol: 'TCS', quantity: 5, avgPrice: 3500, currentPrice: 3900 },
    { symbol: 'INFY', quantity: 15, avgPrice: 1400, currentPrice: 1500 }
  ];

  watchlist: Holding[] = [
    { symbol: 'HDFCBANK', quantity: 0, avgPrice: 0, currentPrice: 1650 },
    { symbol: 'ITC', quantity: 0, avgPrice: 0, currentPrice: 450 }
  ];

  getHoldings() {
      return this.holdings;
  }

  getWatchlist() {
      return this.watchlist;
  }

  getInvestment(h: Holding) {
    return h.quantity * h.avgPrice;
  }

  getCurrentValue(h: Holding) {
    return h.quantity * h.currentPrice;
  }

  getPLPercent(h: Holding) {
    const inv = this.getInvestment(h);
    if (!inv) return 0;
    return ((this.getCurrentValue(h) - inv) / inv) * 100;
  }

  get totalInvestment() {
    return this.holdings.reduce((s, h) => s + this.getInvestment(h), 0);
  }

  get totalCurrentValue() {
    return this.holdings.reduce((s, h) => s + this.getCurrentValue(h), 0);
  }

  get totalPLPercent() {
    if (!this.totalInvestment) return 0;
    return ((this.totalCurrentValue - this.totalInvestment) / this.totalInvestment) * 100;
  }
}
