import { Injectable, inject } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GlobalProgressBarService } from './global-progress-bar.service';
import axios from 'axios';

@Injectable({ providedIn: 'root' })
export class GlobalProgressBarInterceptorService implements HttpInterceptor {
  private globalProgressBarService = inject(GlobalProgressBarService);

  constructor() {
    axios.interceptors.request.use(
      (config) => {
        this.globalProgressBarService.countUp(config.url as string);
        return config;
      },
      (error) => {
        this.globalProgressBarService.countDown();
        return Promise.reject(error);
      },
    );

    axios.interceptors.response.use(
      (response) => {
        this.globalProgressBarService.countDown();
        return response;
      },
      (error) => {
        this.globalProgressBarService.countDown();
        return Promise.reject(error);
      },
    );
  }

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
