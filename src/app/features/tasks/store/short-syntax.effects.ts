import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addNewTagsFromShortSyntax,
  addTask,
  moveToOtherProject,
  scheduleTaskWithTime,
  updateTask,
  updateTaskTags,
} from './task.actions';
import {
  concatMap,
  filter,
  map,
  mapTo,
  mergeMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { TaskReminderOptionId } from '../task.model';
import { GlobalConfigService } from '../../config/global-config.service';
import { unique } from '../../../util/unique';
import { TaskService } from '../task.service';
import { EMPTY, Observable, of } from 'rxjs';
import { ProjectService } from '../../project/project.service';
import { TagService } from '../../tag/tag.service';
import { shortSyntax } from '../short-syntax';
import { remindOptionToMilliseconds } from '../util/remind-option-to-milliseconds';
import { environment } from '../../../../environments/environment';
import { SnackService } from '../../../core/snack/snack.service';
import { PlannerActions } from '../../planner/store/planner.actions';
import { T } from '../../../t.const';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { LayoutService } from '../../../core-ui/layout/layout.service';
import { DEFAULT_GLOBAL_CONFIG } from '../../config/default-global-config.const';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { WorkContextService } from '../../work-context/work-context.service';

import { INBOX_PROJECT } from '../../project/project.const';

@Injectable()
export class ShortSyntaxEffects {
  private _actions$ = inject(Actions);
  private _taskService = inject(TaskService);
  private _tagService = inject(TagService);
  private _projectService = inject(ProjectService);
  private _globalConfigService = inject(GlobalConfigService);
  private _snackService = inject(SnackService);
  private _matDialog = inject(MatDialog);
  private _layoutService = inject(LayoutService);
  private _workContextService = inject(WorkContextService);

  shortSyntax$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addTask, updateTask),
      filter((action): boolean => {
        if (action.isIgnoreShortSyntax) {
          return false;
        }
        if (action.type !== updateTask.type) {
          return true;
        }
        const changeProps = Object.keys(action.task.changes);
        // we only want to execute this for task title updates
        return changeProps.length === 1 && changeProps[0] === 'title';
      }),
      // dirty fix to execute this after setDefaultProjectId$ effect
      concatMap((originalAction): Observable<any> => {
        return this._taskService.getByIdOnce$(originalAction.task.id as string).pipe(
          map((task) => ({
            task,
            originalAction,
          })),
        );
      }),
      withLatestFrom(
        this._tagService.tagsNoMyDayAndNoList$,
        this._projectService.list$,
        this._globalConfigService.misc$.pipe(
          map((misc) => misc.defaultProjectId),
          // TODO re-check
          filter(() => this._workContextService.activeWorkContextId !== INBOX_PROJECT.id),
          concatMap((defaultProjectId) =>
            defaultProjectId
              ? this._projectService.getByIdOnce$(defaultProjectId).pipe(
                  tap((project) => {
                    if (!project) {
                      // to avoid further data inconsistencies
                      throw new Error('Default Project not found');
                    }
                  }),
                  mapTo(defaultProjectId),
                )
              : of(defaultProjectId),
          ),
        ),
      ),
      mergeMap(([{ task, originalAction }, tags, projects, defaultProjectId]) => {
        const r = shortSyntax(
          task,
          this._globalConfigService?.cfg?.shortSyntax ||
            DEFAULT_GLOBAL_CONFIG.shortSyntax,
          tags,
          projects,
        );
        if (environment.production) {
          console.log('shortSyntax', r);
        }
        const isAddDefaultProjectIfNecessary: boolean =
          !!defaultProjectId &&
          !task.projectId &&
          !task.parentId &&
          task.projectId !== defaultProjectId &&
          originalAction.type === addTask.type;

        if (!r) {
          if (isAddDefaultProjectIfNecessary) {
            return [
              moveToOtherProject({
                task,
                targetProjectId: defaultProjectId as string,
              }),
            ];
          }
          return EMPTY;
        }

        const actions: any[] = [];
        const tagIds: string[] = [...(r.taskChanges.tagIds || task.tagIds)];
        const { taskChanges } = r;

        actions.push(
          updateTask({
            task: {
              id: task.id,
              changes: r.taskChanges,
            },
            isIgnoreShortSyntax: true,
          }),
        );
        if (taskChanges.dueWithTime && !taskChanges.reminderId) {
          const { dueWithTime } = taskChanges;
          if (taskChanges.hasPlannedTime === false) {
            const plannedDay = new Date(dueWithTime);
            const plannedDayInIsoFormat = getWorklogStr(plannedDay);
            const plan = PlannerActions.planTaskForDay({
              task,
              day: plannedDayInIsoFormat,
            });
            actions.push(plan);
          } else {
            const schedule = scheduleTaskWithTime({
              task,
              dueWithTime: dueWithTime,
              remindAt: remindOptionToMilliseconds(
                dueWithTime,
                TaskReminderOptionId.AtStart,
              ),
              isMoveToBacklog: false,
            });
            actions.push(schedule);
          }
        }
        if (r.projectId && r.projectId !== task.projectId && !task.parentId) {
          if (task.repeatCfgId) {
            this._snackService.open({
              ico: 'warning',
              msg: T.F.TASK.S.CANNOT_ASSIGN_PROJECT_FOR_REPEATABLE_TASK,
            });
          } else {
            actions.push(
              moveToOtherProject({
                task,
                targetProjectId: r.projectId,
              }),
            );
          }
        } else if (isAddDefaultProjectIfNecessary) {
          actions.push(
            moveToOtherProject({
              task,
              targetProjectId: defaultProjectId as string,
            }),
          );
        }

        if (r.newTagTitles.length) {
          actions.push(
            addNewTagsFromShortSyntax({ taskId: task.id, newTitles: r.newTagTitles }),
          );
        }

        if (tagIds && tagIds.length) {
          const isEqualTags = JSON.stringify(tagIds) === JSON.stringify(task.tagIds);
          if (!task.tagIds) {
            throw new Error('Task Old TagIds need to be passed');
          }
          if (!isEqualTags) {
            actions.push(
              updateTaskTags({
                task,
                newTagIds: unique(tagIds),
              }),
            );
          }
        }

        return actions;
      }),
    ),
  );

  shortSyntaxAddNewTags$: any = createEffect(() =>
    this._actions$.pipe(
      ofType(addNewTagsFromShortSyntax),
      // needed cause otherwise task gets the focus after blur & hide
      tap((v) => this._layoutService.hideAddTaskBar()),
      concatMap(({ taskId, newTitles }) => {
        //Making sure the user isnt trying to create two tags with the same name
        const uniqueNewTitles = [...new Set(newTitles)];

        return this._matDialog
          .open(DialogConfirmComponent, {
            restoreFocus: true,
            autoFocus: true,
            data: {
              okTxt:
                uniqueNewTitles.length > 1
                  ? T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAGS.OK
                  : T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAG.OK,
              message:
                uniqueNewTitles.length > 1
                  ? T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAGS.MSG
                  : T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAG.MSG,
              translateParams: {
                tagsTxt: `<strong>${uniqueNewTitles.join(', ')}</strong>`,
              },
            },
          })
          .afterClosed()
          .pipe(
            // NOTE: it is important to get a fresh task here, since otherwise we might run into #3728
            withLatestFrom(this._taskService.getByIdOnce$(taskId)),
            mergeMap(([isConfirm, task]) => {
              const actions: any[] = [];
              if (isConfirm) {
                const newTagIds = [...task.tagIds];
                uniqueNewTitles.forEach((newTagTitle) => {
                  const { action, id } = this._tagService.getAddTagActionAndId({
                    title: newTagTitle,
                  });
                  actions.push(action);
                  newTagIds.push(id);
                });
                actions.push(
                  updateTaskTags({
                    task,
                    newTagIds: unique(newTagIds),
                  }),
                );
              }
              return of(...actions);
            }),
          );
      }),
    ),
  );
}
