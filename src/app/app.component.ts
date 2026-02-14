import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HoldingsListComponent } from './components/holdings-list/holdings-list.component';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
import { DashboardTabsComponent } from './dashboard-tabs.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: true,
  imports: [
      CommonModule,
      DashboardTabsComponent
    ],
})
export class AppComponent {}
