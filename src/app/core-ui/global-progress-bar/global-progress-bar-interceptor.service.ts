import { inject, Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GlobalProgressBarService } from './global-progress-bar.service';

@Injectable({ providedIn: 'root' })
export class GlobalProgressBarInterceptorService implements HttpInterceptor {
  private globalProgressBarService = inject(GlobalProgressBarService);

  constructor() {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    this.globalProgressBarService.countUp(req.url);
    return next.handle(req).pipe(
      finalize(() => {
        this.globalProgressBarService.countDown();
      }),
    );
  }
}
