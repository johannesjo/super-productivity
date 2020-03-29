import {Injectable} from '@angular/core';
import {Actions, createEffect, Effect, ofType} from '@ngrx/effects';
import {concatMap, filter, first, map, skip, switchMap, take, tap} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {selectTagFeatureState} from './tag.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {T} from '../../../t.const';
import {SnackService} from '../../../core/snack/snack.service';
import {deleteTag, deleteTags, updateTag, updateWorkEndForTag, updateWorkStartForTag} from './tag.actions';
import {AddTimeSpent, RemoveTagsForAllTasks, TaskActionTypes} from '../../tasks/store/task.actions';
import {TagService} from '../tag.service';
import {TaskService} from '../../tasks/task.service';
import {of} from 'rxjs';
import {Task} from '../../tasks/task.model';
import {Tag} from '../tag.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {WorkContextType} from '../../work-context/work-context.model';
import {WorkContextService} from '../../work-context/work-context.service';


@Injectable()
export class TagEffects {
  // updateTagsStorage$ = createEffect(() => this._actions$.pipe(
  //   ofType(
  //     tagActions.addTag,
  //     tagActions.updateTag,
  //     tagActions.upsertTag,
  //     tagActions.deleteTag,
  //     tagActions.deleteTags,
  //
  //     TaskActionTypes.UpdateTaskTags,
  //     TaskActionTypes.AddTask,
  //   ),
  //   switchMap(() => this.saveToLs$),
  // ), {dispatch: false});
  //
  // updateTagsStorageConditional$ = createEffect(() => this._actions$.pipe(
  //   ofType(
  //     moveTaskInTodayList
  //   ),
  //   filter((p) => p.workContextType === WorkContextType.TAG),
  //   switchMap(() => this.saveToLs$),
  // ), {dispatch: false});
  // saveToLs$ = this._store$.pipe(
  //   select(selectTagFeatureState),
  //   take(1),
  //   switchMap((tagState) => this._persistenceService.tag.saveState(tagState)),
  //   tap(this._updateLastActive.bind(this)),
  //   tap(() => console.log('SAVE'))
  // );

  updateLs$ = createEffect(() => this._store$.pipe(
    select(selectTagFeatureState),
    // skip initial state
    skip(1),
    switchMap((tagState) => this._persistenceService.tag.saveState(tagState)),
    tap(this._updateLastActive.bind(this)),
  ), {dispatch: false});

  @Effect({dispatch: false})
  snackUpdateBaseSettings$: any = this._actions$.pipe(
    ofType(updateTag),
    tap(() => this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.TAG.S.UPDATED,
    }))
  );


  @Effect()
  updateWorkStart$: any = this._actions$
    .pipe(
      ofType(TaskActionTypes.AddTimeSpent),
      concatMap(({payload}: AddTimeSpent) => payload.task.parentId
        ? this._taskService.getByIdOnce$(payload.task.parentId).pipe(first())
        : of(payload.task)
      ),
      filter((task: Task) => task.tagIds && !!task.tagIds.length),
      concatMap((task: Task) => this._tagService.getTagsByIds$(task.tagIds).pipe(first())),
      concatMap((tags: Tag[]) => tags
        // only if not assigned for day already
        .filter(tag => !tag.workStart[getWorklogStr()])
        .map((tag) => updateWorkStartForTag({
            id: tag.id,
            date: getWorklogStr(),
            newVal: Date.now(),
          })
        )
      ),
    );

  @Effect()
  updateWorkEnd$: any = this._actions$
    .pipe(
      ofType(TaskActionTypes.AddTimeSpent),
      concatMap(({payload}: AddTimeSpent) => payload.task.parentId
        ? this._taskService.getByIdOnce$(payload.task.parentId).pipe(first())
        : of(payload.task)
      ),
      filter((task: Task) => task.tagIds && !!task.tagIds.length),
      concatMap((task: Task) => this._tagService.getTagsByIds$(task.tagIds).pipe(first())),
      concatMap((tags: Tag[]) => tags
        .map((tag) => updateWorkEndForTag({
            id: tag.id,
            date: getWorklogStr(),
            newVal: Date.now(),
          })
        )
      ),
    );

  @Effect({dispatch: false})
  deleteTagRelatedData: any = this._actions$
    .pipe(
      ofType(
        deleteTag,
        deleteTags,
      ),
      map((a: any) => a.ids ? a.ids : [a.id]),
      tap(async (tagIdsToRemove: string[]) => {
        // remove from all tasks
        this._taskService.removeTagsForAllTask(tagIdsToRemove);
        // remove from archive
        await this._persistenceService.taskArchive.execAction(new RemoveTagsForAllTasks({tagIdsToRemove}));
      }),
    );

  @Effect({dispatch: false})
  cleanupNullTasksForTaskList: any = this._workContextService.activeWorkContextTypeAndId$.pipe(
    filter(({activeType}) => activeType === WorkContextType.TAG),
    switchMap(({activeType, activeId}) => this._workContextService.todaysTasks$.pipe(
      take(1),
      map((tasks) => ({
        allTasks: tasks,
        nullTasks: tasks.filter(task => !task),
        activeType,
        activeId,
      })),
    )),
    filter(({nullTasks}) => nullTasks.length > 0),
    tap((arg) => console.log('Error INFO Today:', arg)),
    tap(({activeId, allTasks}) => {
      const allIds = allTasks.map(t => t && t.id);
      const r = confirm('Nooo! We found some tasks with no data. It is strongly recommended to delete them to avoid further data corruption. Delete them now?');
      if (r) {
        this._tagService.updateTag(activeId, {
          taskIds: allIds.filter((id => !!id)),
        });
        alert('Done!');
      }
    }),
  );


  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _persistenceService: PersistenceService,
    private _snackService: SnackService,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
  ) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
