import { Routes } from '@angular/router';
import { HoldingsListComponent } from './components/holdings-list/holdings-list.component';
import { CorePortfolioComponent } from './components/core-portfolio/core-portfolio.component';
import { SwingTradeGroupsComponent } from './components/swing-trade-groups/swing-trade-groups.component';
import { TradesToGroupComponent } from './components/trades-to-group/trades-to-group.component';
import { MainLayoutComponent } from './components/main-layout/main-layout.component';
import { WatchlistDeviationComponent } from './components/watchlist-deviation/watchlist-deviation.component';
import { ReturnsComponent } from './components/returns/returns.component';
import { ReturnsChartComponent } from './components/returns-chart/returns-chart.component';
import { ClosedSwingReportComponent } from './components/closed-swing-report/closed-swing-report.component';
import { ScannersComponent } from './components/scanners/scanners.component';
import { ScanSetupComponent } from './components/scan-setup/scan-setup.component';
export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'swing' },
      { path: 'swing', component: SwingTradeGroupsComponent },
      { path: 'trades', component: TradesToGroupComponent },
      { path: 'holdings', component: HoldingsListComponent },
      { path: 'core', component: CorePortfolioComponent },
      { path: 'watchlist', component: WatchlistDeviationComponent},
      { path: 'returns', component: ReturnsComponent },
      { path: 'closed-swing', component: ClosedSwingReportComponent },
      { path: 'scanners', component: ScannersComponent },
      { path: 'scan-setup', component: ScanSetupComponent },
      {path: 'returns/chart/:symbol',component: ReturnsChartComponent
}
    ],
  },
  { path: '**', redirectTo: 'swing' },
];