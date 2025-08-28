import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './loading.service';

/**
 * Intercepts all HTTP requests and toggles the global LoadingService.
 * This ensures the loading icon shows across pages while data is loading.
 */
@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip requests if needed by header flag, e.g., req.headers.has('X-Skip-Loading')
    this.loading.show();
    return next.handle(req).pipe(
      finalize(() => this.loading.hide())
    );
  }
}
