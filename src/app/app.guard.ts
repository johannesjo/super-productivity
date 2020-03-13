import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {WorkContextService} from './features/work-context/work-context.service';
import {Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {WorkContextType} from './features/work-context/work-context.model';

@Injectable({
  providedIn: 'root'
})
export class ActiveWorkContextGuard implements CanActivate {
  constructor(
    private workContextService: WorkContextService,
    private router: Router,
  ) {
  }

  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
    return this.workContextService.activeWorkContextTypeAndId$.pipe(
      switchMap(({activeType, activeId}) => {
        const base = activeType === WorkContextType.TAG
          ? 'tag'
          : 'project';
        const url = `/${base}/${activeId}/${next.url[1].path}`;
        return of(this.router.parseUrl(url));
      })
    );
  }
}
