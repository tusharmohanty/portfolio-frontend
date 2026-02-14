import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HoldingsListComponent } from './components/holdings-list/holdings-list.component';
import { WatchlistComponent } from './components/watchlist/watchlist.component';
@Component({
  selector: 'app-dashboard-tabs',
    standalone: true,
    imports: [
      CommonModule,
      HoldingsListComponent,   // ⭐ REQUIRED
      WatchlistComponent       // ⭐ REQUIRED
    ],
  templateUrl: './dashboard-tabs.component.html',
  styleUrls: ['./dashboard-tabs.component.css']
})
export class DashboardTabsComponent {
  tab = 'holdings';
}
