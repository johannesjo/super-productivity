import { inject, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReminderService } from './reminder.service';
import { MatDialog } from '@angular/material/dialog';
import { IS_ELECTRON } from '../../app.constants';
import {
  concatMap,
  delay,
  filter,
  first,
  mapTo,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';
import { Reminder } from './reminder.model';
import { UiHelperService } from '../ui-helper/ui-helper.service';
import { NotifyService } from '../../core/notify/notify.service';
import { DialogViewTaskRemindersComponent } from '../tasks/dialog-view-task-reminders/dialog-view-task-reminders.component';
import { throttle } from 'helpful-decorators';
import { SyncTriggerService } from '../../imex/sync/sync-trigger.service';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { from, merge, of, timer } from 'rxjs';
import { TaskService } from '../tasks/task.service';
import { SnackService } from '../../core/snack/snack.service';
import { T } from 'src/app/t.const';

@NgModule({
  declarations: [],
  imports: [CommonModule],
})
export class ReminderModule {
  private readonly _reminderService = inject(ReminderService);
  private readonly _matDialog = inject(MatDialog);
  private readonly _snackService = inject(SnackService);
  private readonly _uiHelperService = inject(UiHelperService);
  private readonly _notifyService = inject(NotifyService);
  private readonly _layoutService = inject(LayoutService);
  private readonly _taskService = inject(TaskService);
  private readonly _syncTriggerService = inject(SyncTriggerService);

  constructor() {
    from(this._reminderService.init())
      .pipe(
        // we do this to wait for syncing and the like
        concatMap(
          () => this._syncTriggerService.afterInitialSyncDoneAndDataLoadedInitially$,
        ),
        first(),
        delay(1000),
        concatMap(() =>
          this._reminderService.onRemindersActive$.pipe(
            // NOTE: we simply filter for open dialogs, as reminders are re-queried quite often
            filter(
              (reminder) =>
                this._matDialog.openDialogs.length === 0 &&
                !!reminder &&
                reminder.length > 0,
            ),
            withLatestFrom(this._layoutService.isShowAddTaskBar$),
            // don't show reminders while add task bar is open
            switchMap(([reminders, isShowAddTaskBar]: [Reminder[], boolean]) =>
              isShowAddTaskBar
                ? merge([
                    this._layoutService.isShowAddTaskBar$.pipe(
                      filter((isShowAddTaskBarLive) => !isShowAddTaskBarLive),
                    ),
                    // in case someone just forgot to close it
                    timer(10000),
                  ]).pipe(first(), mapTo(reminders), delay(1000))
                : of(reminders),
            ),
          ),
        ),
      )
      .subscribe((reminders: Reminder[]) => {
        if (IS_ELECTRON) {
          this._uiHelperService.focusApp();
        }

        this._showNotification(reminders);

        const oldest = reminders[0];
        if (oldest.type === 'TASK') {
          if (this._taskService.currentTaskId === oldest.relatedId) {
            this._snackService.open({
              type: 'CUSTOM',
              msg: T.F.REMINDER.S_ACTIVE_TASK_DUE,
              translateParams: {
                title: oldest.title,
              },
              config: {
                // show for longer
                duration: 20000,
              },
              ico: 'alarm',
            });
            this._reminderService.removeReminder(oldest.id);
            this._taskService.update(oldest.relatedId, {
              reminderId: undefined,
              plannedAt: undefined,
            });
          } else {
            this._matDialog
              .open(DialogViewTaskRemindersComponent, {
                autoFocus: false,
                restoreFocus: true,
                data: {
                  reminders,
                },
              })
              .afterClosed();
          }
        }
      });
  }

  @throttle(60000)
  private _showNotification(reminders: Reminder[]): void {
    const isMultiple = reminders.length > 1;
    const title = isMultiple
      ? '"' +
        reminders[0].title +
        '" and ' +
        (reminders.length - 1) +
        ' other tasks are due.'
      : reminders[0].title;
    const tag = reminders.reduce((acc, reminder) => acc + '_' + reminder.id, '');

    this._notifyService
      .notify({
        title,
        // prevents multiple notifications on mobile
        tag,
        requireInteraction: true,
      })
      .then();
  }
}
