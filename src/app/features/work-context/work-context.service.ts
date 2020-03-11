import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of, timer} from 'rxjs';
import {WorkContext, WorkContextState, WorkContextType} from './work-context.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {loadWorkContextState, setActiveWorkContext} from './store/work-context.actions';
import {initialContextState} from './store/work-context.reducer';
import {NavigationStart, Router, RouterEvent} from '@angular/router';
import {concatMap, filter, switchMap, tap} from 'rxjs/operators';
import {TaskService} from '../tasks/task.service';
import {MY_DAY_TAG} from '../tag/tag.const';
import {TagService} from '../tag/tag.service';

@Injectable({
  providedIn: 'root',
})
export class WorkContextService {
  // TODO properly wait for model load
  mainWorkContexts$: Observable<WorkContext[]> =
    this._tagService.getById$(MY_DAY_TAG.id).pipe(
      switchMap(myDayTag => of([
          ({
            ...myDayTag,
            title: myDayTag.name,
            taskIds: [],
          } as WorkContext)
        ])
      ),
    );

  activeWorkContext$ = this._router.events.pipe(
    filter(event => event instanceof NavigationStart),
  );

  constructor(
    private _store$: Store<WorkContextState>,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _tagService: TagService,
    private _router: Router,
  ) {

    this._router.events.pipe(
      filter(event => event instanceof NavigationStart),
    ).subscribe(({url}: RouterEvent) => {
        const split = url.split('/');
        const id = split[split.length - 1];

        if (url.match('context')) {
          this.setActiveContext(id, WorkContextType.TAG);
        } else {
          this.setActiveContext(id, WorkContextType.PROJECT);
        }
      }
    );
  }

  async load() {
    const state = await this._persistenceService.context.loadState() || initialContextState;
    const {activeId, activeType} = state;

    let url;
    switch (activeType) {
      case WorkContextType.TAG:
        url = `context/${activeId}`;
        this._router.navigate(['/context', activeId]);
        break;
      case WorkContextType.PROJECT:
        // url = `work-view/${state.activeId}`;
        this._router.navigate(['/work-view']);
        break;
    }

    this._store$.dispatch(loadWorkContextState({state}));
  }

  setActiveContext(activeId: string, activeType: WorkContextType) {
    console.log(activeType, activeId);
    this._store$.dispatch(setActiveWorkContext({activeId, activeType}));
  }

  private _loadListForProject() {

  }

  private _loadListForMultipleProjects() {

  }


}
