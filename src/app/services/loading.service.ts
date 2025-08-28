import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Global LoadingService to manage a simple app-wide loading state.
 * Uses a ref-count so multiple overlapping operations are handled safely.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  private readonly _isLoading$ = new BehaviorSubject<boolean>(false);
  readonly isLoading$ = this._isLoading$.asObservable();

  show(): void {
    this.counter++;
    if (this.counter === 1) {
      this._isLoading$.next(true);
    }
  }

  hide(): void {
    if (this.counter > 0) {
      this.counter--;
      if (this.counter === 0) {
        this._isLoading$.next(false);
      }
    }
  }

  /** Force reset (useful on errors that bypass normal flow) */
  reset(): void {
    this.counter = 0;
    this._isLoading$.next(false);
  }
}
