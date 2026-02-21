import { Routes } from '@angular/router';
import { HoldingsListComponent } from './components/holdings-list/holdings-list.component';
import { CorePortfolioComponent } from './components/core-portfolio/core-portfolio.component';

export const routes: Routes = [
  // default landing
  { path: '', redirectTo: 'holdings', pathMatch: 'full' },

  // ✅ your pages
  { path: 'holdings', component: HoldingsListComponent },
  { path: 'core', component: CorePortfolioComponent },

  // ✅ wildcard LAST (or it will hijack /core)
  { path: '**', redirectTo: 'holdings' },
];