import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {EMPTY, Observable, of} from 'rxjs';
import {WorkContext, WorkContextState, WorkContextType} from './work-context.model';
import {PersistenceService} from '../../core/persistence/persistence.service';
import {loadWorkContextState, setActiveWorkContext} from './store/work-context.actions';
import {initialContextState, selectActiveContextTypeAndId} from './store/work-context.reducer';
import {NavigationStart, Router, RouterEvent} from '@angular/router';
import {filter, map, switchMap} from 'rxjs/operators';
import {TaskService} from '../tasks/task.service';
import {MY_DAY_TAG} from '../tag/tag.const';
import {TagService} from '../tag/tag.service';
import {TaskWithSubTasks} from '../tasks/task.model';

@Injectable({
  providedIn: 'root',
})
export class WorkContextService {
  // TODO properly wait for model load
  mainWorkContexts$: Observable<WorkContext[]> =
    this._tagService.getTagById$(MY_DAY_TAG.id).pipe(
      switchMap(myDayTag => of([
          ({
            ...myDayTag,
          } as WorkContext)
        ])
      ),
    );
  //
  // activeWorkContext$ = this._router.events.pipe(
  //   filter(event => event instanceof NavigationStart),
  // );


  activeWorkContext$ = this._store$.pipe(
    select(selectActiveContextTypeAndId),
    switchMap(({activeId, activeType}) => {
      if (activeType === WorkContextType.TAG) {
        return this._tagService.getTagById$(activeId);
      }
      if (activeType === WorkContextType.PROJECT) {
        // TODO map project
        return EMPTY;
      }
      return EMPTY;
    }),
    filter(ctx => !!ctx),
  );

  undoneTasks$: Observable<TaskWithSubTasks[]> = this.activeWorkContext$.pipe(
    switchMap(activeWorkContext => this._taskService.getByIds$(activeWorkContext.taskIds)),
    map(tasks => tasks.filter(task => !task.isDone))
  );

  doneTasks$: Observable<TaskWithSubTasks[]> = this.activeWorkContext$.pipe(
    switchMap(activeWorkContext => this._taskService.getByIds$(activeWorkContext.taskIds)),
    map(tasks => tasks.filter(task => task.isDone))
  );

  constructor(
    private _store$: Store<WorkContextState>,
    private _persistenceService: PersistenceService,
    private _taskService: TaskService,
    private _tagService: TagService,
    private _router: Router,
  ) {
    this.activeWorkContext$.subscribe((v) => console.log('activeWorkContext$', v));

    this.undoneTasks$.subscribe((v) => console.log('undoneTasks$', v));


    this._router.events.pipe(
      filter(event => event instanceof NavigationStart),
    ).subscribe(({url}: RouterEvent) => {
        const split = url.split('/');
        const id = split[split.length - 1];

        if (url.match('tag')) {
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
        url = `tag/${activeId}`;
        this._router.navigate(['/tag', activeId]);
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
