import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Injectable({ providedIn: 'root' })
export class KiteAuthService {
  // If you already have a better source of truth, replace this.
  private _loggedIn = signal(false);
  
  constructor(private http: HttpClient) {}

  loggedIn() {
    return this._loggedIn();
  }
  checkAuthStatus() {
    this.http.get<boolean>('/auth/kite/status')
      .subscribe({
        next: (v) => this._loggedIn.set(v),
        error: () => this._loggedIn.set(false)
      });
  }

  setLoggedIn(v: boolean) {
    this._loggedIn.set(v);
  }

startKiteLogin(currentUrl?: string) {
  const returnTo = currentUrl ?? '/';
  const rt = encodeURIComponent(returnTo);
  window.location.href = `/auth/kite/login?returnTo=${rt}`;
}
}