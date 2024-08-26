import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { WorkContextService } from './features/work-context/work-context.service';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, map, switchMap, take } from 'rxjs/operators';
import { WorkContextType } from './features/work-context/work-context.model';
import { TagService } from './features/tag/tag.service';
import { ProjectService } from './features/project/project.service';
import { DataInitService } from './core/data-init/data-init.service';
import { Store } from '@ngrx/store';
import { selectIsFocusOverlayShown } from './features/focus-mode/store/focus-mode.selectors';

@Injectable({ providedIn: 'root' })
export class ActiveWorkContextGuard {
  constructor(
    private _workContextService: WorkContextService,
    private _router: Router,
  ) {}

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
        const urlTree = this._router.parseUrl(url);
        urlTree.queryParams = next.queryParams;
        return of(urlTree);
      }),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class ValidTagIdGuard {
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
      catchError(() => of(false)),
      take(1),
      map((tag) => !!tag),
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FocusOverlayOpenGuard {
  constructor(private _store: Store) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> {
    return this._store.select(selectIsFocusOverlayShown).pipe(map((isShown) => !isShown));
  }
}

@Injectable({ providedIn: 'root' })
export class ValidProjectIdGuard {
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
      catchError(() => of(false)),
      map((project) => !!project),
    );
  }
}
