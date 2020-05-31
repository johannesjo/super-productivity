import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {finalize} from 'rxjs/operators';
import {GlobalProgressBarService} from './global-progress-bar.service';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class GlobalProgressBarInterceptorService implements HttpInterceptor {

  constructor(
    private globalProgressBarService: GlobalProgressBarService,
  ) {

    axios.interceptors.request.use((config) => {
      console.log(config);

      this.globalProgressBarService.countUp();
      return config;
    }, (error) => {
      this.globalProgressBarService.countDown();
      return Promise.reject(error);
    });

    axios.interceptors.response.use((response) => {
      this.globalProgressBarService.countDown();
      return response;
    }, (error) => {
      this.globalProgressBarService.countDown();
      return Promise.reject(error);
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log(req);

    this.globalProgressBarService.countUp();
    return next.handle(req).pipe(
      finalize(() => {
        this.globalProgressBarService.countDown();
      })
    );
  }
}


