import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { setCurrentTask, updateTask } from '../../tasks/store/task.actions';
import { Store } from '@ngrx/store';
import { filter, map, tap, withLatestFrom } from 'rxjs/operators';
import { selectCurrentTask } from '../../tasks/store/task.selectors';
import { androidInterface } from '../android-interface';
import { TaskCopy } from '../../tasks/task.model';
import { showAddTaskBar } from '../../../core-ui/layout/store/layout.actions';
import { timer } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SnackService } from '../../../core/snack/snack.service';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';

// TODO send message to electron when current task changes here

@Injectable()
export class AndroidEffects {
  private _actions$ = inject(Actions);
  private _store$ = inject<Store<any>>(Store);
  private _reminderService = inject(ReminderService);
  private _snackService = inject(SnackService);

  askPermissionsIfNotGiven$ =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
      () =>
        timer(1000).pipe(
          tap(async (v) => {
            console.log('XXXXXXXXXX I am here!');

            alert('AAA');
            try {
              const checkResult = await LocalNotifications.checkPermissions();
              if (checkResult.display === 'denied') {
                const r = await LocalNotifications.requestPermissions();
                console.log(r);
                const r2 = await LocalNotifications.changeExactNotificationSetting();
                console.log(r2);
              }
            } catch (error) {
              console.error(error);
              this._snackService.open({
                type: 'ERROR',
                msg: error?.toString() || 'Notifications not supported',
              });
            }
          }),
        ),
      {
        dispatch: false,
      },
    );

  scheduleNotifications$ =
    IS_ANDROID_WEB_VIEW &&
    createEffect(
      () =>
        timer(2000, 20000).pipe(
          tap(async (v) => {
            try {
              const checkResult = await LocalNotifications.checkPermissions();
              if (checkResult.display === 'granted') {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      id: v,
                      title: 'reminder.title' + v,
                      body: 'reminder.body' + v,
                      schedule: {
                        // eslint-disable-next-line no-mixed-operators
                        at: new Date(Date.now() + 5000),
                        allowWhileIdle: true,
                      },
                    },
                  ],
                });
              }
            } catch (error) {
              console.error(error);
              this._snackService.open({
                type: 'ERROR',
                msg: error?.toString() || 'Notifications not supported',
              });
            }
          }),
        ),
      {
        dispatch: false,
      },
    );

  markTaskAsDone$ = createEffect(() =>
    androidInterface.onMarkCurrentTaskAsDone$.pipe(
      withLatestFrom(this._store$.select(selectCurrentTask)),
      filter(([, currentTask]) => !!currentTask),
      map(([, currentTask]) =>
        updateTask({
          task: { id: (currentTask as TaskCopy).id, changes: { isDone: true } },
        }),
      ),
    ),
  );

  pauseTracking$ = createEffect(() =>
    androidInterface.onPauseCurrentTask$.pipe(
      withLatestFrom(this._store$.select(selectCurrentTask)),
      filter(([, currentTask]) => !!currentTask),
      map(([, currentTask]) => setCurrentTask({ id: null })),
    ),
  );

  showAddTaskBar$ = createEffect(() =>
    androidInterface.onAddNewTask$.pipe(map(() => showAddTaskBar())),
  );
}
