import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { WorkContextService } from './features/work-context/work-context.service';
import { Observable, of } from 'rxjs';
import { concatMap, map, switchMap, take } from 'rxjs/operators';
import { WorkContextType } from './features/work-context/work-context.model';
import { TagService } from './features/tag/tag.service';
import { ProjectService } from './features/project/project.service';
import { DataInitService } from './core/data-init/data-init.service';

@Injectable({ providedIn: 'root' })
export class ActiveWorkContextGuard implements CanActivate {
  constructor(private _workContextService: WorkContextService, private _router: Router) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<UrlTree> {
    return this._workContextService.activeWorkContextTypeAndId$.pipe(
      take(1),
      switchMap(({ activeType, activeId }) => {
        const { subPageType, param } = next.params;
        const base = activeType === WorkContextType.TAG ? 'tag' : 'project';
        const url = `/${base}/${activeId}/${subPageType}${param ? '/' + param : ''}`;
        return of(this._router.parseUrl(url));
      }),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ValidTagIdGuard implements CanActivate {
  constructor(
    private _tagService: TagService,
    private _dataInitService: DataInitService,
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> {
    const { id } = next.params;
    return this._dataInitService.isAllDataLoadedInitially$.pipe(
      concatMap(() => this._tagService.getTagById$(id)),
      take(1),
      map((tag) => !!tag),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ValidProjectIdGuard implements CanActivate {
  constructor(
    private _projectService: ProjectService,
    private _dataInitService: DataInitService,
  ) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> {
    const { id } = next.params;
    return this._dataInitService.isAllDataLoadedInitially$.pipe(
      concatMap(() => this._projectService.getByIdOnce$(id)),
      map((project) => !!project),
    );
  }
}
