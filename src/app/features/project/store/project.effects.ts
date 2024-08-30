import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { concatMap, filter, first, map, switchMap, take, tap } from 'rxjs/operators';
import {
  addProject,
  addProjects,
  addToProjectBreakTime,
  archiveProject,
  deleteProject,
  loadProjectRelatedDataSuccess,
  moveAllProjectBacklogTasksToTodayList,
  moveProjectTaskDownInBacklogList,
  moveProjectTaskInBacklogList,
  moveProjectTaskToBacklogList,
  moveProjectTaskToBacklogListAuto,
  moveProjectTaskToBottomInBacklogList,
  moveProjectTaskToTodayList,
  moveProjectTaskToTodayListAuto,
  moveProjectTaskToTopInBacklogList,
  moveProjectTaskUpInBacklogList,
  unarchiveProject,
  updateProject,
  updateProjectAdvancedCfg,
  updateProjectIssueProviderCfg,
  updateProjectOrder,
  updateProjectWorkEnd,
  updateProjectWorkStart,
  upsertProject,
} from './project.actions';
import { PersistenceService } from '../../../core/persistence/persistence.service';
import { BookmarkService } from '../../bookmark/bookmark.service';
import { NoteService } from '../../note/note.service';
import { SnackService } from '../../../core/snack/snack.service';
import {
  addTask,
  addTimeSpent,
  convertToMainTask,
  deleteTask,
  deleteTasks,
  moveToArchive_,
  moveToOtherProject,
  restoreTask,
} from '../../tasks/store/task.actions';
import { ReminderService } from '../../reminder/reminder.service';
import { ProjectService } from '../project.service';
import { GlobalConfigService } from '../../config/global-config.service';
import { T } from '../../../t.const';
import {
  moveTaskDownInTodayList,
  moveTaskInTodayList,
  moveTaskUpInTodayList,
} from '../../work-context/store/work-context-meta.actions';
import { WorkContextType } from '../../work-context/work-context.model';
import { setActiveWorkContext } from '../../work-context/store/work-context.actions';
import { Project } from '../project.model';
import { TaskService } from '../../tasks/task.service';
import { Task, TaskArchive, TaskState } from '../../tasks/task.model';
import { unique } from '../../../util/unique';
import { TaskRepeatCfgService } from '../../task-repeat-cfg/task-repeat-cfg.service';
import { EMPTY, Observable, of } from 'rxjs';
import { TaskRepeatCfg } from '../../task-repeat-cfg/task-repeat-cfg.model';
import { selectProjectFeatureState } from './project.selectors';
import {
  addNote,
  deleteNote,
  moveNoteToOtherProject,
  updateNoteOrder,
} from '../../note/store/note.actions';
import { DateService } from 'src/app/core/date/date.service';
import { selectAllNotes } from '../../note/store/note.reducer';
import { Note } from '../../note/note.model';

@Injectable()
export class ProjectEffects {
  syncProjectToLs$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addProject.type,
          addProjects.type,
          upsertProject.type,
          deleteProject.type,
          updateProject.type,
          updateProjectAdvancedCfg.type,
          updateProjectIssueProviderCfg.type,
          updateProjectWorkStart.type,
          updateProjectWorkEnd.type,
          addToProjectBreakTime.type,
          updateProjectOrder.type,
          archiveProject.type,
          unarchiveProject.type,
          moveToOtherProject.type,
          moveNoteToOtherProject.type,

          moveProjectTaskInBacklogList.type,
          moveProjectTaskToBacklogList.type,
          moveProjectTaskToTodayList.type,
          moveProjectTaskUpInBacklogList.type,
          moveProjectTaskDownInBacklogList.type,
          moveProjectTaskToTopInBacklogList.type,
          moveProjectTaskToBottomInBacklogList.type,
          moveProjectTaskToBacklogListAuto.type,
          moveProjectTaskToTodayListAuto.type,
        ),
        switchMap((a) => {
          // exclude ui only actions
          if (
            [updateProjectWorkStart.type, updateProjectWorkEnd.type].includes(
              a.type as any,
            )
          ) {
            return this.saveToLs$(false);
          } else {
            return this.saveToLs$(true);
          }
        }),
      ),
    { dispatch: false },
  );

  updateProjectStorageConditionalNote$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateNoteOrder, addNote, deleteNote),
        switchMap((a) => {
          let isChange = false;
          switch (a.type) {
            case updateNoteOrder.type:
              isChange = a.activeContextType === WorkContextType.PROJECT;
              break;
            case addNote.type:
              isChange = !!a.note.projectId;
              break;
            case deleteNote.type:
              isChange = !!a.projectId;
              break;
          }
          return isChange ? of(a) : EMPTY;
        }),
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

  updateProjectStorageConditionalTask$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(
          addTask,
          deleteTask,
          moveToOtherProject,
          restoreTask,
          moveToArchive_,
          convertToMainTask,
        ),
        switchMap((a) => {
          let isChange = false;
          switch (a.type) {
            case addTask.type:
              isChange = !!a.task.projectId;
              break;
            case deleteTask.type:
              isChange = !!a.task.projectId;
              break;
            case moveToOtherProject.type:
              isChange = !!a.task.projectId;
              break;
            case moveToArchive_.type:
              isChange = !!a.tasks.find((task) => !!task.projectId);
              break;
            case restoreTask.type:
              isChange = !!a.task.projectId;
              break;
            case convertToMainTask.type:
              isChange = !!a.task.projectId;
              break;
          }
          return isChange ? of(a) : EMPTY;
        }),
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

  updateProjectStorageConditional$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(moveTaskInTodayList, moveTaskUpInTodayList, moveTaskDownInTodayList),
        filter((p) => p.workContextType === WorkContextType.PROJECT),
        switchMap(() => this.saveToLs$(true)),
      ),
    { dispatch: false },
  );

  updateWorkStart$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      filter(({ task }) => !!task.projectId),
      concatMap(({ task }) =>
        this._projectService.getByIdOnce$(task.projectId as string).pipe(first()),
      ),
      filter((project: Project) => !project.workStart[this._dateService.todayStr()]),
      map((project) => {
        return updateProjectWorkStart({
          id: project.id,
          date: this._dateService.todayStr(),
          newVal: Date.now(),
        });
      }),
    ),
  );

  updateWorkEnd$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(addTimeSpent),
      filter(({ task }) => !!task.projectId),
      map(({ task }) => {
        return updateProjectWorkEnd({
          id: task.projectId as string,
          date: this._dateService.todayStr(),
          newVal: Date.now(),
        });
      }),
    ),
  );

  onProjectIdChange$: Observable<unknown> = createEffect(() =>
    this._actions$.pipe(
      ofType(setActiveWorkContext),
      filter(({ activeType }) => activeType === WorkContextType.PROJECT),
      switchMap((action) => {
        const projectId = action.activeId;
        return Promise.all([this._bookmarkService.loadStateForProject(projectId)]).then(
          () => projectId,
        );
      }),
      map((projectId) => {
        return loadProjectRelatedDataSuccess({ projectId });
      }),
    ),
  );

  // TODO a solution for orphaned tasks might be needed

  deleteProjectRelatedData: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject.type),
        tap(async ({ id }) => {
          await this._persistenceService.removeCompleteRelatedDataForProject(id);
          this._removeAllNonArchiveTasksForProject(id);
          this._removeAllArchiveTasksForProject(id);
          this._removeAllRepeatingTasksForProject(id);
          this._removeAlNotesForProject(id);

          // we also might need to account for this unlikely but very nasty scenario
          const cfg = await this._globalConfigService.cfg$.pipe(take(1)).toPromise();
          if (id === cfg.misc.defaultProjectId) {
            this._globalConfigService.updateSection('misc', { defaultProjectId: null });
          }
          if (
            cfg.calendarIntegration.calendarProviders.find(
              (p) => p.defaultProjectId === id,
            )
          ) {
            this._globalConfigService.updateSection('calendarIntegration', {
              ...cfg.calendarIntegration,
              calendarProviders: cfg.calendarIntegration.calendarProviders.map((p) =>
                p.defaultProjectId === id ? { ...p, defaultProjectId: null } : p,
              ),
            });
          }
        }),
      ),
    { dispatch: false },
  );

  moveAllProjectToTodayListWhenBacklogIsDisabled$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProject),
        filter((a) => a.project.changes.isEnableBacklog === false),
        map((a) => {
          return moveAllProjectBacklogTasksToTodayList({
            projectId: a.project.id as string,
          });
        }),
      ),
  );

  // CURRENTLY NOT IMPLEMENTED
  // archiveProject: Observable<unknown> = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(archiveProject.type),
  //       tap(async ({ id }) => {
  //         await this._persistenceService.archiveProject(id);
  //         // TODO remove reminders
  //         this._snackService.open({
  //           ico: 'archive',
  //           msg: T.F.PROJECT.S.ARCHIVED,
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );
  // unarchiveProject: Observable<unknown> = createEffect(
  //   () =>
  //     this._actions$.pipe(
  //       ofType(unarchiveProject.type),
  //       tap(async ({ id }) => {
  //         await this._persistenceService.unarchiveProject(id);
  //
  //         this._snackService.open({
  //           ico: 'unarchive',
  //           msg: T.F.PROJECT.S.UNARCHIVED,
  //         });
  //       }),
  //     ),
  //   { dispatch: false },
  // );

  // PURE SNACKS
  // -----------

  snackUpdateIssueProvider$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProjectIssueProviderCfg.type),
        tap(({ issueProviderKey }) => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.ISSUE_PROVIDER_UPDATED,
            translateParams: {
              issueProviderKey,
            },
          });
        }),
      ),
    { dispatch: false },
  );

  snackUpdateBaseSettings$: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(updateProject.type),
        tap(() => {
          this._snackService.open({
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.UPDATED,
          });
        }),
      ),
    { dispatch: false },
  );

  onProjectCreatedSnack: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(addProject.type),
        tap(({ project }) => {
          this._snackService.open({
            ico: 'add',
            type: 'SUCCESS',
            msg: T.F.PROJECT.S.CREATED,
            translateParams: { title: (project as Project).title },
          });
        }),
      ),
    { dispatch: false },
  );

  showDeletionSnack: Observable<unknown> = createEffect(
    () =>
      this._actions$.pipe(
        ofType(deleteProject.type),
        tap(() => {
          this._snackService.open({
            ico: 'delete_forever',
            msg: T.F.PROJECT.S.DELETED,
          });
        }),
      ),
    { dispatch: false },
  );

  // NOTE: does not seem to be necessary any more
  // moveToTodayListOnAddTodayTag: Observable<unknown> = createEffect(() =>
  //   this._actions$.pipe(
  //     ofType(updateTaskTags),
  //     filter(
  //       ({ task, newTagIds }) => !!task.projectId && newTagIds.includes(TODAY_TAG.id),
  //     ),
  //     concatMap(({ task, newTagIds }) =>
  //       this._projectService.getByIdOnce$(task.projectId as string).pipe(
  //         map((project) => ({
  //           project,
  //           task,
  //           newTagIds,
  //         })),
  //       ),
  //     ),
  //     filter(({ project }) => !project.taskIds.includes(TODAY_TAG.id)),
  //     map(({ task, newTagIds, project }) =>
  //       moveProjectTaskToTodayListAuto({
  //         projectId: project.id,
  //         taskId: task.id,
  //         isMoveToTop: false,
  //       }),
  //     ),
  //   ),
  // );

  // @Effect()
  // moveToBacklogOnRemoveTodayTag: Observable<unknown> = this._actions$.pipe(
  //   ofType(updateTaskTags),
  //   filter((action: UpdateTaskTags) =>
  //     task.projectId &&
  //   ),
  //   concatMap((action) => this._projectService.getByIdOnce$(task.projectId).pipe(
  //     map((project) => ({
  //       project,
  //       p: action.payload,
  //     }))
  //   )),
  //   filter(({project}) => !project.taskIds.includes(TODAY_TAG.id)),
  //   map(({p, project}) => moveTaskToTodayList({
  //     workContextId: project.id,
  //     taskId: p.task.id,
  //     newOrderedIds: [p.task.id, ...project.backlogTaskIds],
  //     src: 'DONE',
  //     target: 'BACKLOG'
  //   })),
  // );

  constructor(
    private _actions$: Actions,
    private _store$: Store<any>,
    private _snackService: SnackService,
    private _projectService: ProjectService,
    private _persistenceService: PersistenceService,
    private _bookmarkService: BookmarkService,
    private _noteService: NoteService,
    private _globalConfigService: GlobalConfigService,
    private _reminderService: ReminderService,
    // private _workContextService: WorkContextService,
    private _taskService: TaskService,
    private _taskRepeatCfgService: TaskRepeatCfgService,
    private _dateService: DateService,
  ) {}

  private async _removeAllNonArchiveTasksForProject(
    projectIdToDelete: string,
  ): Promise<any> {
    const taskState: TaskState = await this._taskService.taskFeatureState$
      .pipe(
        filter((s) => s.isDataLoaded),
        first(),
      )
      .toPromise();
    const nonArchiveTaskIdsToDelete = taskState.ids.filter((id) => {
      const t = taskState.entities[id] as Task;
      if (!t) {
        throw new Error('No task');
      }
      // NOTE sub tasks are accounted for in DeleteMainTasks action
      return t.projectId === projectIdToDelete;
    });

    console.log(
      'TaskIds to remove/unique',
      nonArchiveTaskIdsToDelete,
      unique(nonArchiveTaskIdsToDelete),
    );
    this._taskService.removeMultipleTasks(nonArchiveTaskIdsToDelete);
  }

  private async _removeAllArchiveTasksForProject(
    projectIdToDelete: string,
  ): Promise<any> {
    const taskArchiveState: TaskArchive =
      await this._persistenceService.taskArchive.loadState();
    // NOTE: task archive might not if there never was a day completed
    const archiveTaskIdsToDelete = !!taskArchiveState
      ? (taskArchiveState.ids as string[]).filter((id) => {
          const t = taskArchiveState.entities[id] as Task;
          if (!t) {
            throw new Error('No task');
          }
          return t.projectId === projectIdToDelete;
        })
      : [];
    console.log(
      'Archive TaskIds to remove/unique',
      archiveTaskIdsToDelete,
      unique(archiveTaskIdsToDelete),
    );
    // remove archive
    await this._persistenceService.taskArchive.execAction(
      deleteTasks({ taskIds: archiveTaskIdsToDelete }),
      true,
    );
  }

  private async _removeAllRepeatingTasksForProject(
    projectIdToDelete: string,
  ): Promise<any> {
    const taskRepeatCfgs: TaskRepeatCfg[] =
      await this._taskRepeatCfgService.taskRepeatCfgs$.pipe(first()).toPromise();
    const allCfgIdsForProject = taskRepeatCfgs.filter(
      (cfg) => cfg.projectId === projectIdToDelete,
    );

    const cfgsIdsToRemove: string[] = allCfgIdsForProject
      .filter((cfg) => !cfg.tagIds || cfg.tagIds.length === 0)
      .map((cfg) => cfg.id as string);
    if (cfgsIdsToRemove.length > 0) {
      this._taskRepeatCfgService.deleteTaskRepeatCfgsNoTaskCleanup(cfgsIdsToRemove);
    }

    const cfgsToUpdate: string[] = allCfgIdsForProject
      .filter((cfg) => cfg.tagIds && cfg.tagIds.length > 0)
      .map((taskRepeatCfg) => taskRepeatCfg.id as string);
    if (cfgsToUpdate.length > 0) {
      this._taskRepeatCfgService.updateTaskRepeatCfgs(cfgsToUpdate, { projectId: null });
    }
  }

  private async _removeAlNotesForProject(projectIdToDelete: string): Promise<any> {
    const notes: Note[] = await this._store$
      .select(selectAllNotes)
      .pipe(first())
      .toPromise();
    const allNoteIdsForProject = notes.filter(
      (cfg) => cfg.projectId === projectIdToDelete,
    );
    allNoteIdsForProject.forEach((note) => {
      this._noteService.remove(note);
    });
  }

  private saveToLs$(isSyncModelChange: boolean): Observable<unknown> {
    return this._store$.pipe(
      // tap(() => console.log('SAVE')),
      select(selectProjectFeatureState),
      take(1),
      switchMap((projectState) =>
        this._persistenceService.project.saveState(projectState, { isSyncModelChange }),
      ),
    );
  }
}
