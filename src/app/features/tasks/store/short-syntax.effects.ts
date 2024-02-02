import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  addNewTagsFromShortSyntax,
  addTask,
  moveToOtherProject,
  scheduleTask,
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
import { shortSyntax } from '../short-syntax.util';
import { remindOptionToMilliseconds } from '../util/remind-option-to-milliseconds';
import { environment } from '../../../../environments/environment';
import { SnackService } from '../../../core/snack/snack.service';
import { T } from '../../../t.const';
import { MatDialog } from '@angular/material/dialog';
import { DialogConfirmComponent } from '../../../ui/dialog-confirm/dialog-confirm.component';
import { LayoutService } from '../../../core-ui/layout/layout.service';

@Injectable()
export class ShortSyntaxEffects {
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
        this._tagService.tags$,
        this._projectService.list$,
        this._globalConfigService.misc$.pipe(
          map((misc) => misc.defaultProjectId),
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
        const r = shortSyntax(task, tags, projects);
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
        if (taskChanges.plannedAt && !taskChanges.reminderId) {
          const { plannedAt } = taskChanges;
          const schedule = scheduleTask({
            task,
            plannedAt,
            remindAt: remindOptionToMilliseconds(plannedAt, TaskReminderOptionId.AtStart),
            isMoveToBacklog: false,
          });
          actions.push(schedule);
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
          actions.push(addNewTagsFromShortSyntax({ task, newTitles: r.newTagTitles }));
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
                oldTagIds: task.tagIds,
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
      concatMap(({ task, newTitles }) => {
        return this._matDialog
          .open(DialogConfirmComponent, {
            restoreFocus: true,
            autoFocus: true,
            data: {
              okTxt:
                newTitles.length > 1
                  ? T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAGS.OK
                  : T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAG.OK,
              message:
                newTitles.length > 1
                  ? T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAGS.MSG
                  : T.F.TASK.D_CONFIRM_SHORT_SYNTAX_NEW_TAG.MSG,
              translateParams: {
                tagsTxt: `<strong>${newTitles.join(', ')}</strong>`,
              },
            },
          })
          .afterClosed()
          .pipe(
            mergeMap((isConfirm: boolean) => {
              const actions: any[] = [];
              if (isConfirm) {
                const newTagIds = [...task.tagIds];
                newTitles.forEach((newTagTitle) => {
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
                    oldTagIds: task.tagIds,
                  }),
                );
              }
              return of(...actions);
            }),
          );
      }),
    ),
  );

  constructor(
    private _actions$: Actions,
    private _taskService: TaskService,
    private _tagService: TagService,
    private _projectService: ProjectService,
    private _globalConfigService: GlobalConfigService,
    private _snackService: SnackService,
    private _matDialog: MatDialog,
    private _layoutService: LayoutService,
  ) {}
}
