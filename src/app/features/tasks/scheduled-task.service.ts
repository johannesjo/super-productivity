import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { TaskService } from './task.service';
import { ReminderService } from '../reminder/reminder.service';
import { TaskWithReminderData } from './task.model';
import { devError } from '../../util/dev-error';

@Injectable({ providedIn: 'root' })
export class ScheduledTaskService {
  private _taskService = inject(TaskService);
  private _reminderService = inject(ReminderService);

  allScheduledTasks$: Observable<TaskWithReminderData[]> =
    this._reminderService.reminders$.pipe(
      map((reminders) => reminders.filter((reminder) => reminder.type === 'TASK')),
      switchMap((reminders) => {
        const ids = reminders.map((r) => r.relatedId);
        return this._taskService.getByIdsLive$(ids).pipe(
          map((tasks) =>
            tasks
              .filter((task) => {
                if (!task) {
                  console.log({ reminders, tasks });
                  devError('Reminder without task data');
                }
                return !!task;
              })
              .map(
                (task) =>
                  ({
                    ...task,
                    reminderData: reminders.find(
                      (reminder) => reminder.relatedId === task.id,
                    ),
                  }) as TaskWithReminderData,
              ),
          ),
          // NOTE: task length check is required, because otherwise the observable won't trigger for empty array
          switchMap((tasks: TaskWithReminderData[]) =>
            tasks.length
              ? forkJoin(
                  tasks.map((task) =>
                    !!task.parentId
                      ? this._taskService.getByIdOnce$(task.parentId).pipe(
                          map((parentData) => ({
                            ...task,
                            parentData,
                          })),
                        )
                      : of(task),
                  ),
                )
              : of([]),
          ),
        );
      }),
      map((tasks: TaskWithReminderData[]) =>
        tasks.sort((a, b) => a.reminderData.remindAt - b.reminderData.remindAt),
      ),
      shareReplay(1),
    );
}
