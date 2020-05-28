import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {GlobalProgressBarService} from './global-progress-bar.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalProgressBarInterceptorService implements HttpInterceptor {

  constructor(
    private globalProgressBarService: GlobalProgressBarService,
  ) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.globalProgressBarService.countUp();
    return next.handle(req).pipe(
      finalize(() => {
        this.globalProgressBarService.countDown();
      })
    );
  }
}
