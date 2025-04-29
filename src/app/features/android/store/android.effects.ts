import { inject, Injectable } from '@angular/core';
import { Actions, createEffect } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { switchMap, tap } from 'rxjs/operators';
import { timer } from 'rxjs';
import { ReminderService } from '../../reminder/reminder.service';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SnackService } from '../../../core/snack/snack.service';
import { IS_ANDROID_WEB_VIEW } from '../../../util/is-android-web-view';
import { LocalNotificationSchema } from '@capacitor/local-notifications/dist/esm/definitions';

// TODO send message to electron when current task changes here

const DELAY_PERMISSIONS = 2000;
const DELAY_SCHEDULE = 5000;

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
        timer(DELAY_PERMISSIONS).pipe(
          tap(async (v) => {
            try {
              const checkResult = await LocalNotifications.checkPermissions();
              if (checkResult.display === 'denied') {
                console.log(await LocalNotifications.requestPermissions());
                console.log(await LocalNotifications.changeExactNotificationSetting());
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
        timer(DELAY_SCHEDULE).pipe(
          switchMap(() => this._reminderService.reminders$),
          tap(async (reminders) => {
            try {
              const checkResult = await LocalNotifications.checkPermissions();
              if (checkResult.display === 'granted') {
                const pendingNotifications = await LocalNotifications.getPending();
                console.log({ pendingNotifications });
                if (pendingNotifications.notifications.length > 0) {
                  await LocalNotifications.cancel({
                    notifications: pendingNotifications.notifications.map((n) => ({
                      id: n.id,
                    })),
                  });
                }
                await LocalNotifications.schedule({
                  notifications: reminders.map((reminder) => {
                    // since the ids are temporary we can use just Math.random()
                    const id = Math.round(Math.random() * 10000000);
                    const mapped: LocalNotificationSchema = {
                      id,
                      title: reminder.title,
                      body: '',
                      extra: {
                        reminder,
                      },
                      schedule: {
                        // eslint-disable-next-line no-mixed-operators
                        at: new Date(reminder.remindAt),
                        allowWhileIdle: true,
                        repeats: false,
                        every: undefined,
                      },
                    };
                    return mapped;
                  }),
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

  // markTaskAsDone$ = createEffect(() =>
  //   androidInterface.onMarkCurrentTaskAsDone$.pipe(
  //     withLatestFrom(this._store$.select(selectCurrentTask)),
  //     filter(([, currentTask]) => !!currentTask),
  //     map(([, currentTask]) =>
  //       updateTask({
  //         task: { id: (currentTask as TaskCopy).id, changes: { isDone: true } },
  //       }),
  //     ),
  //   ),
  // );
  //
  // pauseTracking$ = createEffect(() =>
  //   androidInterface.onPauseCurrentTask$.pipe(
  //     withLatestFrom(this._store$.select(selectCurrentTask)),
  //     filter(([, currentTask]) => !!currentTask),
  //     map(([, currentTask]) => setCurrentTask({ id: null })),
  //   ),
  // );
  // showAddTaskBar$ = createEffect(() =>
  //   androidInterface.onAddNewTask$.pipe(map(() => showAddTaskBar())),
  // );
}
