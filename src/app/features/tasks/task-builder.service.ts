import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { first, timeout } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { SnackService } from '../../core/snack/snack.service';
import { Log } from '../../core/log';
import { T } from '../../t.const';
import { TaskReminderOptionId } from './task.model';
import { TaskService } from './task.service';
import { TaskRepeatCfgService } from '../task-repeat-cfg/task-repeat-cfg.service';
import { IS_ELECTRON } from '../../app.constants';
import { TagService } from '../tag/tag.service';
import { unique } from '../../util/unique';
import type { AddTaskPayload } from './add-task-bar/add-task-payload-builder';

@Injectable({
  providedIn: 'root',
})
export class TaskBuilderService {
  private readonly _taskService = inject(TaskService);
  private readonly _taskRepeatCfgService = inject(TaskRepeatCfgService);
  private readonly _tagService = inject(TagService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);

  addTask(payload: AddTaskPayload): string | Promise<string> {
    return this._addTaskLocally(payload);
  }

  private _addTaskLocally(payload: AddTaskPayload): string {
    const taskData = this._createNewTagsAndMergeTaskData(payload);
    const taskId = this._taskService.add(
      payload.title,
      payload.isAddToBacklog,
      taskData,
      payload.isAddToBottom,
    );

    const resolvedRemindOption = payload.remindOption;
    // Skip scheduleTask for timed repeat tasks — the addRepeatCfgToTaskUpdateTask$
    // effect already handles scheduling via scheduleTaskWithTime, so calling both
    // would cause double-scheduling. `repeatCfg.startTime` is set exactly when the
    // bar carried both a non-DIALOG recurrence and a time.
    const isTimedRepeatTask = !!payload.repeatCfg?.startTime;

    if (taskData.dueWithTime && !isTimedRepeatTask) {
      this._taskService
        .getByIdOnce$(taskId)
        .pipe(first(), timeout(1000))
        .subscribe((task) => {
          this._taskService.scheduleTask(
            task,
            taskData.dueWithTime!,
            resolvedRemindOption,
            payload.isAddToBacklog,
          );
        });
    }

    if (payload.repeat?.type === 'DIALOG') {
      this._openRepeatDialogForTask(taskId, resolvedRemindOption);
    } else if (payload.repeatCfg) {
      this._taskRepeatCfgService.addTaskRepeatCfgToTask(
        taskId,
        taskData.projectId || null,
        payload.repeatCfg,
      );
    }

    return taskId;
  }

  private _createNewTagsAndMergeTaskData(
    payload: AddTaskPayload,
  ): AddTaskPayload['taskData'] {
    if (!payload.newTagTitles?.length) {
      return payload.taskData;
    }

    const newTagIds = payload.newTagTitles.map((title) =>
      this._tagService.addTag({ title }),
    );
    return {
      ...payload.taskData,
      tagIds: unique([...(payload.taskData.tagIds ?? []), ...newTagIds]),
    };
  }

  private _openRepeatDialogForTask(
    taskId: string,
    remindOption: TaskReminderOptionId,
  ): void {
    void firstValueFrom(
      this._taskService.getByIdOnce$(taskId).pipe(first(), timeout(1000)),
    )
      .then(async (task) => {
        if (IS_ELECTRON) {
          window.ea.showOrFocus();
        }
        const { DialogEditTaskRepeatCfgComponent } =
          await import('../task-repeat-cfg/dialog-edit-task-repeat-cfg/dialog-edit-task-repeat-cfg.component');
        this._matDialog.open(DialogEditTaskRepeatCfgComponent, {
          data: { task, defaultRemindOption: remindOption },
        });
      })
      .catch((err) => {
        Log.error('Failed to open repeat dialog', err);
        this._snackService.open({
          type: 'ERROR',
          msg: T.F.TASK_REPEAT.SNACK_REPEAT_DIALOG_FAIL,
        });
      });
  }
}
