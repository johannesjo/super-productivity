import {Injectable} from '@angular/core';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {concatMap, filter, first, map, skip, switchMap, take, tap} from 'rxjs/operators';
import {select, Store} from '@ngrx/store';
import {selectTagFeatureState} from './tag.reducer';
import {PersistenceService} from '../../../core/persistence/persistence.service';
import {T} from '../../../t.const';
import {SnackService} from '../../../core/snack/snack.service';
import {deleteTag, deleteTags, updateTag, updateWorkEndForTag, updateWorkStartForTag} from './tag.actions';
import {AddTimeSpent, DeleteMainTasks, RemoveTagsForAllTasks, TaskActionTypes} from '../../tasks/store/task.actions';
import {TagService} from '../tag.service';
import {TaskService} from '../../tasks/task.service';
import {of} from 'rxjs';
import {Task, TaskArchive} from '../../tasks/task.model';
import {Tag} from '../tag.model';
import {getWorklogStr} from '../../../util/get-work-log-str';
import {WorkContextType} from '../../work-context/work-context.model';
import {WorkContextService} from '../../work-context/work-context.service';
import {Router} from '@angular/router';
import {TODAY_TAG} from '../tag.const';
import {createEmptyEntity} from '../../../util/create-empty-entity';
import {DataInitService} from '../../../core/data-init/data-init.service';


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

  @Effect({dispatch: false})
  updateLs$ = this._dataInitService.isAllDataLoadedInitially$.pipe(
    // NOTE: because _dataInitService.isAllDataLoadedInitially$ is ready before the effects are run
    // (but after the update is there) we need to skip the initial update
    skip(1),
    tap(console.log),
    concatMap(() => this._store$.pipe(select(selectTagFeatureState))),
    switchMap((tagState) => this._persistenceService.tag.saveState(tagState)),
    tap(this._updateLastActive.bind(this)),
  );

  @Effect({dispatch: false})
  snackUpdateBaseSettings$: any = this._actions$.pipe(
    ofType(updateTag),
    tap(() => this._snackService.open({
      type: 'SUCCESS',
      msg: T.F.TAG.S.UPDATED,
    }))
  );


  @Effect()
  updateWorkStart$: any = this._actions$.pipe(
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
  updateWorkEnd$: any = this._actions$.pipe(
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
  deleteTagRelatedData: any = this._actions$.pipe(
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

      const isOrphanedParentTask = (t: Task) => !t.projectId && !t.tagIds.length && !t.parentId;

      // remove orphaned
      const tasks = await this._taskService.allTasks$.pipe(first()).toPromise();
      const taskIdsToRemove: string[] = tasks.filter(isOrphanedParentTask).map(t => t.id);
      this._taskService.removeMultipleMainTasks(taskIdsToRemove);

      // remove orphaned for archive
      const taskArchiveState: TaskArchive = await this._persistenceService.taskArchive.loadState() || createEmptyEntity();
      const archiveTaskIdsToDelete = (taskArchiveState.ids as string[]).filter((id) => {
        const t = taskArchiveState.entities[id];
        return isOrphanedParentTask(t);
      });
      await this._persistenceService.taskArchive.execAction(new DeleteMainTasks({taskIds: archiveTaskIdsToDelete}));
    }),
  );

  @Effect({dispatch: false})
  redirectIfCurrentTagIsDeleted: any = this._actions$.pipe(
    ofType(
      deleteTag,
      deleteTags,
    ),
    map((a: any) => a.ids ? a.ids : [a.id]),
    tap(async (tagIdsToRemove: string[]) => {
      if (tagIdsToRemove.includes(this._workContextService.activeWorkContextId)) {
        this._router.navigate([`tag/${TODAY_TAG.id}/tasks`]);
      }
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
    private _dataInitService: DataInitService,
    private _snackService: SnackService,
    private _tagService: TagService,
    private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _router: Router,
  ) {
  }

  private _updateLastActive() {
    this._persistenceService.saveLastActive();
  }
}
