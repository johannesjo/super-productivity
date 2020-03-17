import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot} from '@angular/router';
import {WorkContextService} from './features/work-context/work-context.service';
import {Observable, of} from 'rxjs';
import {switchMap, take} from 'rxjs/operators';
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
      take(1),
      switchMap(({activeType, activeId}) => {
        const {subPageType, param} = next.params;
        const base = activeType === WorkContextType.TAG
          ? 'tag'
          : 'project';
        const url = `/${base}/${activeId}/${subPageType}${param ? '/' + param : ''}`;
        return of(this.router.parseUrl(url));
      })
    );
  }
}
