import {Injectable} from '@angular/core';
import {Store} from '@ngrx/store';
import {Observable, of} from 'rxjs';
import {Context, ContextState, ContextType} from './context.model';
import {PersistenceService} from '../core/persistence/persistence.service';
import {loadContextState, setActiveContext} from './store/context.actions';
import {initialContextState} from './store/context.reducer';
import {NavigationStart, Router, RouterEvent} from '@angular/router';
import {filter} from 'rxjs/operators';
import {TaskService} from '../features/tasks/task.service';

@Injectable({
  providedIn: 'root',
})
export class ContextService {
  nonProjectContexts$: Observable<Context[]> = of([
    {
      id: 'all',
      title: 'All Tasks',
      icon: 'wb_sunny',
      isTranslate: true,
      taskIds: null,
      criteria: [
        {projects: 'all'}
      ]
    },
    {
      id: 'TEST',
      title: 'Test',
      icon: 'wifi',
      isTranslate: true,
      taskIds: null,
      criteria: [
        {projects: 'TEST'}
      ]
    }
  ]);

  activeList$ = this._router.events.pipe(
    filter(event => event instanceof NavigationStart),
  );

  constructor(
    private _store$: Store<ContextState>,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _router: Router,
  ) {
    this._router.events.pipe(
      filter(event => event instanceof NavigationStart),
    ).subscribe(({url}: RouterEvent) => {
        console.log('_router.events', url);
        const split = url.split('/');
        const id = split[split.length - 1];

        if (url.match('context')) {
          console.log('CONTEYT');

          this.setActiveContext(id, ContextType.MULTIPLE_PROJECTS);
        } else {
          this.setActiveContext(id, ContextType.PROJECT);
        }
      }
    );
  }

  async load() {
    const state = await this._persistenceService.context.loadState() || initialContextState;
    const {activeId, activeType} = state;

    let url;
    switch (activeType) {
      case ContextType.MULTIPLE_PROJECTS:
        url = `context/${activeId}`;
        this._router.navigate(['/context', activeId]);
        break;
      case ContextType.PROJECT:
        // url = `work-view/${state.activeId}`;
        this._router.navigate(['/work-view']);
        break;
    }

    this._store$.dispatch(loadContextState({state}));
  }

  setActiveContext(activeId: string, activeType: ContextType) {
    console.log(activeType, activeId);
    this._store$.dispatch(setActiveContext({activeId, activeType}));
  }

  private _loadListForProject() {

  }

  private _loadListForMultipleProjects() {

  }


}
