import Step from 'shepherd.js/src/types/step';
import { nextOnObs, twoWayObs, waitForEl } from './shepherd-helper';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { filter, first, map, switchMap } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { addTask, deleteTask, updateTask } from '../tasks/store/task.actions';
import { GlobalConfigState } from '../config/global-config.model';
import { IS_MOUSE_PRIMARY } from '../../util/is-mouse-primary';
import { NavigationEnd, Router } from '@angular/router';
import { promiseTimeout } from '../../util/promise-timeout';
import { hideAddTaskBar } from '../../core-ui/layout/store/layout.actions';
import { LS } from '../../core/persistence/storage-keys.const';
import { KeyboardConfig } from '../config/keyboard-config.model';
import { WorkContextService } from '../work-context/work-context.service';
import { ShepherdService } from './shepherd.service';

const PRIMARY_CLASSES = 'mat-flat-button mat-button-base mat-primary';
const SECONDARY_CLASSES = 'mat-button mat-button-base';

const NEXT_BTN = {
  classes: PRIMARY_CLASSES,
  text: 'Next',
  type: 'next',
};

const CANCEL_BTN: any = (shepherdService: ShepherdService) => ({
  classes: SECONDARY_CLASSES,
  text: 'Exit Tour',
  action: () => {
    shepherdService.show(TourId.StartTourAgain);
  },
});

const CLICK = IS_MOUSE_PRIMARY ? '<em>click</em>' : '<em>tap</em>';
const CLICK_B = IS_MOUSE_PRIMARY ? '<em>Click</em>' : '<em>Tap</em>';

export enum TourId {
  Welcome = 'Welcome',
  AddTask = 'AddTask',
  DeleteTask = 'DeleteTask',
  Sync = 'Sync',
  Calendars = 'Calendars',
  ProductivityHelper = 'ProductivityHelper',
  IssueProviders = 'IssueProviders',
  Project = 'Project',
  FinishDay = 'FinishDay',
  StartTourAgain = 'StartTourAgain',
  KeyboardNav = 'KeyboardNav',
  FinalCongrats = 'FinalCongrats',
  XXX = 'XXX',
}

export const SHEPHERD_STEPS = (
  shepherdService: ShepherdService,
  cfg: GlobalConfigState,
  actions$: Actions,
  layoutService: LayoutService,
  taskService: TaskService,
  router: Router,
  workContextService: WorkContextService,
): Array<Step.StepOptions> => {
  const KEY_COMBO = (action: keyof KeyboardConfig) =>
    `<kbd>${cfg.keyboard[action]}</kbd>`;

  return [
    {
      id: TourId.Welcome,
      title: 'Welcome to Super Productivity!!',
      text: '<p>Super Productivity is a ToDo app that helps you to improve your personal workflows.</p><p>Let`s do a little tour!</p>',
      buttons: [CANCEL_BTN(shepherdService), NEXT_BTN],
    },
    {
      id: TourId.AddTask,
      title: "Let's add your first task!",
      text: IS_MOUSE_PRIMARY
        ? `<em>Click</em> on this button or press ${KEY_COMBO('addNewTask')}.`
        : '<em>Tap</em> on the button with the +',
      attachTo: {
        element: '.tour-addBtn',
        on: 'bottom',
      },
      ...nextOnObs(
        layoutService.isShowAddTaskBar$.pipe(filter((v) => v)),
        shepherdService,
        () => {
          router.navigate(['/']);
        },
      ),
    },
    {
      title: 'Enter a title!',
      text: 'Enter the title you want to give your task and hit the <kbd>Enter</kbd> key.',
      attachTo: {
        element: 'add-task-bar',
        on: 'bottom',
      },
      beforeShowPromise: () => promiseTimeout(200),
      ...twoWayObs(
        { obs: actions$.pipe(ofType(addTask)) },
        { obs: actions$.pipe(ofType(hideAddTaskBar)) },
        shepherdService,
      ),
    },
    {
      title: 'Close the Add Task Bar!',
      text: IS_MOUSE_PRIMARY
        ? 'Press the <kbd>Escape</kbd> key or <em>click</em> anywhere on the grayed out backdrop to leave the add task bar.'
        : '<em>Tap</em> anywhere on the grayed out backdrop to leave the add task bar.',
      attachTo: {
        element: 'add-task-bar',
        on: 'bottom',
      },
      beforeShowPromise: () => promiseTimeout(200),
      ...nextOnObs(
        actions$.pipe(ofType(hideAddTaskBar)),
        // delay because other hide should trigger first
        shepherdService,
      ),
    },
    {
      title: 'Congrats! This is your first task!',
      text: 'Let`s start tracking time to it!',
      attachTo: {
        element: 'task',
        on: 'bottom' as any,
      },
      when: {
        show: () => {
          setTimeout(() => {
            shepherdService.next();
          }, 3000);
        },
      },
      beforeShowPromise: () => promiseTimeout(200),
    },
    {
      title: 'Time Tracking',
      text: '<p>Time tracking is useful as it allows you to get a better idea on how you spend your time. It will enable you to make better estimates and can improve how you work.</p><p>Pressing the play button in the top right corner will start your first time tracking session.</p>',
      attachTo: {
        element: '.tour-playBtn',
        on: 'bottom',
      },
      ...nextOnObs(
        taskService.currentTaskId$.pipe(filter((id) => !!id)),
        shepherdService,
      ),
    },
    {
      title: 'Stop Tracking Time',
      text: `To stop tracking ${CLICK} on the pause button.`,
      attachTo: {
        element: '.tour-playBtn',
        on: 'bottom',
      },
      beforeShowPromise: () => promiseTimeout(500),
      ...nextOnObs(taskService.currentTaskId$.pipe(filter((id) => !id)), shepherdService),
    },
    ...(IS_MOUSE_PRIMARY
      ? [
          {
            title: 'Task Hover Menu',
            text: 'There is more you you can do with a task. Hover over the task you created with your mouse again.',
            attachTo: {
              element: 'task',
              on: 'bottom' as any,
            },
            beforeShowPromise: () => promiseTimeout(500),
            when: (() => {
              let timeOutId: number;
              let intId: number;
              return {
                show: () => {
                  timeOutId = window.setTimeout(() => {
                    intId = waitForEl('task .hover-controls', () =>
                      shepherdService.next(),
                    );
                  }, 3200);
                },
                hide: () => {
                  window.clearInterval(intId);
                  window.clearTimeout(timeOutId);
                },
              };
            })(),
          },
          {
            title: 'Opening Task Side Panel',
            attachTo: {
              element: '.show-additional-info-btn',
              on: 'bottom' as any,
            },
            text: 'You can open a panel with additional controls by clicking on the button.',
            ...nextOnObs(
              taskService.selectedTask$.pipe(filter((selectedTask) => !!selectedTask)),
              shepherdService,
            ),
          },
        ]
      : [
          {
            title: 'Task Side Panel',
            text: 'There is more you you can do with task. Tap on the task.',
            attachTo: {
              element: 'task',
              on: 'bottom' as any,
            },
            ...nextOnObs(
              taskService.selectedTask$.pipe(filter((selectedTask) => !!selectedTask)),
              shepherdService,
            ),
          },
        ]),
    {
      title: 'The Task Side Panel',
      text: 'This is the task side panel.Here you can adjust estimates, schedule your task, add some notes or attachments or configure your task to be repeated.',
      buttons: [NEXT_BTN],
      beforeShowPromise: () => promiseTimeout(500),
    },
    {
      title: 'Closing the Task Side Panel',
      text: IS_MOUSE_PRIMARY
        ? 'You can close the panel by clicking the X. Do this now!'
        : 'You can close the panel by tapping on the X. Do this now!',
      attachTo: {
        element: '.show-additional-info-btn',
        on: 'bottom',
      },
      ...nextOnObs(
        taskService.selectedTask$.pipe(filter((selectedTask) => !selectedTask)),
        shepherdService,
      ),
    },
    ...(IS_MOUSE_PRIMARY
      ? [
          {
            title: 'Edit Task Title',
            text: '<p>You can edit the task title by clicking on it. Do this now and change the task title to something else.',
            attachTo: {
              element: '.task-title',
              on: 'bottom' as any,
            },
            beforeShowPromise: () => promiseTimeout(500),
            ...nextOnObs(actions$.pipe(ofType(updateTask)), shepherdService, () => {}),
          },
        ]
      : []),
    {
      id: TourId.DeleteTask,
      title: 'Deleting a Task',
      text: IS_MOUSE_PRIMARY
        ? // eslint-disable-next-line max-len
          `To delete a task you need to open the task context menu. To do so right <em>click</em> on it (or long press on Mac and Mobile) and select "<strong>Delete Task</strong>".`
        : 'To delete a task you need to open the task context menu. To do so long press and select "<strong>Delete Task</strong>" in the menu that opens up.',
      attachTo: {
        element: 'task',
        on: 'bottom',
      },
      beforeShowPromise: () => promiseTimeout(1500),
      when: (() => {
        let intId: number;
        return {
          show: () => {
            intId = waitForEl('.mat-menu-panel', () => {
              shepherdService.hide();
            });
            actions$
              .pipe(ofType(deleteTask), first())
              .subscribe(() => shepherdService.next());
          },
          hide: () => {
            // NOTE this is the exception since we use hide as part of the flow
            // _onDestroy$.complete();
            window.clearInterval(intId);
          },
        };
      })(),
    },
    {
      title: 'Great job!',
      text: 'That covers the basics. Let`s continue with another important subject: <strong>Syncing</strong>!',
      buttons: [NEXT_BTN],
    },
    {
      id: TourId.Sync,
      title: 'Syncing & Data Privacy',
      text: "<p>Super Productivity takes your data privacy very serious. This means that <strong>you decide what will be saved and where</strong>. <strong>The app does NOT collect any data </strong> and there are no user accounts or registration required. It's free and open source and always will be.</p><p>This is important since data is often sold for marketing purposes and leaks happen more often than you would think.</p>",
      buttons: [NEXT_BTN],
    },
    {
      title: 'Syncing & Data Privacy',
      text: '<p>With Super Productivity <strong>you can save and sync your data with a cloud provider of your choosing</strong> or even host it in your own cloud.</p><p>Let me show you where to configure this!!</p>',
      buttons: [NEXT_BTN],
    },
    {
      title: 'Configure Sync',
      attachTo: {
        element: '.tour-burgerTrigger',
        on: 'bottom',
      },
      text: 'Open the menu (<span class="material-icons">menu</span>)',
      ...nextOnObs(
        layoutService.isShowSideNav$.pipe(filter((v) => !!v)),
        shepherdService,
      ),
    },
    {
      title: 'Configure Sync',
      text: `${CLICK_B} on <span class="material-icons">settings</span> <strong>Settings</strong>!`,
      ...nextOnObs(
        router.events.pipe(
          filter((event: any) => event instanceof NavigationEnd),
          map((event) => !!event.url.includes('config')),
          filter((v) => !!v),
        ),
        shepherdService,
        // make sure we are not on config page already
        () => router.navigate(['']),
      ),
    },
    {
      title: 'Configure Sync',
      text: `Scroll down and ${CLICK} to expand the <strong>Sync</strong> Section`,
      attachTo: {
        element: '.tour-syncSection',
        on: 'top',
      },
      scrollTo: true,
      when: (() => {
        let intId: number;
        return {
          show: () => {
            intId = waitForEl('.tour-isSyncEnabledToggle', () => shepherdService.next());
          },
          hide: () => {
            window.clearInterval(intId);
          },
        };
      })(),
    },
    {
      title: 'Configure Sync',
      attachTo: {
        element: '.tour-syncSection',
        on: 'top',
      },
      text: '<p>Here you should be able to configure a sync provider of your choosing. For most people <a href="https://www.dropbox.com/" target="_blank"><strong>Dropbox</strong></a> is probably the easiest solution, that also will offer you automatic backups in the cloud.</p><p>If you have the desktop or Android version of Super Productivity <strong>LocalFile</strong> is another good option. It will let you configure a file path to sync to. You can then sync this file with any provider you like.</p><p>The option <strong>WebDAV</strong> can be used to sync with Nextcloud and others.</p>',
      buttons: [NEXT_BTN],
    },
    {
      title: 'Configure Sync',
      text: 'This covers syncing. If you have any questions you can always ask them <a href="https://github.com/johannesjo/super-productivity/discussions">on the projects GitHub page</a>. ',
      buttons: [NEXT_BTN],
    },

    {
      id: TourId.Calendars,
      when: {
        show: () => {
          router.navigate(['config']).then(() => {
            shepherdService.next();
          });
        },
      },
    },
    {
      title: 'Connect Calendars',
      text: `On the settings page, you can also find the <strong>Calendars</strong> section. ${CLICK_B} on it!`,
      beforeShowPromise: () => promiseTimeout(500),
      attachTo: {
        element: '.config-section:nth-of-type(6)',
        on: 'top',
      },
      when: (() => {
        let intId: number;
        return {
          show: () => {
            intId = waitForEl('.tour-calendarSectionOpen', () => shepherdService.next());
          },
          hide: () => {
            window.clearInterval(intId);
          },
        };
      })(),
      scrollTo: true,
    },
    {
      title: 'Connect Calendars',
      // eslint-disable-next-line max-len
      text: `<p>You will need a link or file path to your calendar to show it's events when they are due and within the timeline. You can load calendar data as iCal.</p><ul>
<li><a target="_blank" href=\"https://support.google.com/calendar/answer/37648?hl=en#zippy=%2Csync-your-google-calendar-view-edit%2Cget-your-calendar-view-only\">Get iCal Link for Google Calendar</a></li>
<li><a target="_blank" href=\"https://support.pushpay.com/s/article/How-do-I-get-an-iCal-link-from-Office-365\">Get iCal Link for Outlook 365</a></li>
</ul>`,
      attachTo: {
        element: '.config-section:nth-of-type(6)',
        on: 'top',
      },
      buttons: [NEXT_BTN],
    },

    {
      id: TourId.ProductivityHelper,
      when: {
        show: () => {
          router.navigate(['config']).then(() => {
            shepherdService.next();
          });
        },
      },
    },
    {
      title: 'Productivity Helper',
      // eslint-disable-next-line max-len
      text: `Another thing you might want to check out is the <strong>Productivity Helper</strong> section. Here you can configure a variety of little tools to your needs.`,
      beforeShowPromise: () => promiseTimeout(500),
      attachTo: {
        element: '.tour-productivityHelper',
        on: 'top',
      },
      scrollTo: true,
      buttons: [NEXT_BTN],
    },

    {
      id: TourId.FinalCongrats,
      title: 'Congratulations!',
      text: '<p>This concludes the tour. Remember that you can always start it again via the Help button in the menu.</p><p>Best way to get familiar with the app, is to play around with it. Have fun!</p>',
      buttons: [
        ...(IS_MOUSE_PRIMARY
          ? [
              {
                text: 'Tour Keyboard Shortcuts',
                classes: PRIMARY_CLASSES,
                action: () => {
                  shepherdService.show(TourId.KeyboardNav);
                },
              } as any,
            ]
          : []),
        {
          text: 'End Tour',
          classes: PRIMARY_CLASSES,
          action: () => {
            shepherdService.complete();
          },
        } as any,
      ],
    },
    {
      id: TourId.StartTourAgain,
      title: 'Show again?',
      text: 'Do you want to show the tour again the next time you start the app? You can always show the tour again via the help button in the left menu.',
      when: {
        show: () => {
          if (localStorage.getItem(LS.IS_SHOW_TOUR)) {
            shepherdService.complete();
          }
        },
      },
      buttons: [
        {
          text: 'Never show again',
          classes: SECONDARY_CLASSES,
          action: () => {
            localStorage.setItem(LS.IS_SHOW_TOUR, 'true');
            shepherdService.complete();
          },
        } as any,
        {
          text: 'Show again next time',
          classes: PRIMARY_CLASSES,
          action: () => {
            localStorage.removeItem(LS.IS_SHOW_TOUR);
            shepherdService.complete();
          },
        } as any,
      ],
    },
    {
      id: TourId.KeyboardNav,
      title: 'Keyboard Navigation',
      text: '<p>The most efficient way to user Super Productivity is to make use of the keyboard shortcuts. Don`t worry there just a handful of important ones :)</p><p>You can configure most of them under "Settings / Keyboard Shortcuts", but let`s start more practical.</p>',
      buttons: [NEXT_BTN],
    },
    {
      title: 'Keyboard Navigation',
      text: `Let\`s add a couple of tasks. Press ${KEY_COMBO('addNewTask')}.`,
      ...nextOnObs(
        layoutService.isShowAddTaskBar$.pipe(filter((v) => v)),
        shepherdService,
      ),
    },
    {
      title: 'Enter a title!',
      text: 'Enter the title you want to give your task and hit the <kbd>Enter</kbd> key. <strong>Do this a couple of times until you have at least 4 tasks with different titles</strong>.',
      attachTo: {
        element: 'add-task-bar',
        on: 'bottom',
      },
      beforeShowPromise: () => promiseTimeout(200),
      ...twoWayObs(
        {
          obs: actions$.pipe(
            ofType(addTask),
            switchMap(() =>
              workContextService.todaysTasks$.pipe(filter((tasks) => tasks.length >= 4)),
            ),
          ),
        },
        { obs: actions$.pipe(ofType(hideAddTaskBar)) },
        shepherdService,
      ),
    },
    {
      title: 'Close the Add Task Bar!',
      text: 'Press the <kbd>Escape</kbd> key to leave the add task bar.',
      attachTo: {
        element: 'add-task-bar',
        on: 'bottom',
      },
      beforeShowPromise: () => promiseTimeout(200),
      ...nextOnObs(
        actions$.pipe(ofType(hideAddTaskBar)),
        // delay because other hide should trigger first
        shepherdService,
      ),
    },
    {
      title: 'A focused task',
      text: 'Do you see the <span class="shepherd-colored-border">colored border</span> around the first task? This means the task is focused. To unfocus it click somewhere else in the document.',
      when: {
        show: () => taskService.focusFirstTaskIfVisible(),
      },
      buttons: [NEXT_BTN],
    },
    {
      title: 'Focussing Tasks',
      text: `If you lost focus you can always use the ${KEY_COMBO(
        'goToWorkView',
      )} key to go to the main list view and focus the first task.`,
      buttons: [NEXT_BTN],
    },
    {
      id: 'XXX',
      title: 'Moving around',
      // eslint-disable-next-line max-len
      text: `<p>When a task is focused you can navigate to other tasks by pressing the arrow keys <kbd>↑</kbd> and <kbd>↓</kbd>.</p>`,
      when: {
        show: () => taskService.focusFirstTaskIfVisible(),
      },
      buttons: [NEXT_BTN],
    },
    {
      title: 'Moving tasks around',
      text: `You can move the focused task itself around by pressing ${KEY_COMBO(
        'moveTaskUp',
      )} and ${KEY_COMBO('moveTaskDown')}.`,
      when: {
        show: () => taskService.focusFirstTaskIfVisible(),
      },
      buttons: [NEXT_BTN],
    },
    {
      title: 'Edit Task Title',
      text: `You can edit the task by pressing the <kbd>Enter</kbd> or the configured ${KEY_COMBO(
        'taskEditTitle',
      )}key.`,
      when: {
        show: () => taskService.focusFirstTaskIfVisible(),
      },
      buttons: [NEXT_BTN],
    },
    {
      title: 'Open, close and navigate the Task Side Panel',
      // eslint-disable-next-line max-len
      text: `<p>You can open the task side panel for a task by pressing <kbd>→</kbd> while it is focused. You can close it again by pressing <kbd>←</kbd></p><p>You can also navigate and activate it's items by using the arrow keys <kbd>→</kbd> <kbd>↑</kbd> and <kbd>↓</kbd>.</p><p>You can leave most contexts that open up this way by pressing <kbd>Escape</kbd>.</p>`,
      when: {
        show: () => taskService.focusFirstTaskIfVisible(),
      },
      buttons: [NEXT_BTN],
    },
    {
      title: 'More Task Shortcuts',
      when: {
        show: () => taskService.focusFirstTaskIfVisible(),
      },
      // eslint-disable-next-line max-len
      text: `<p>There are more task related shortcuts that can be used when a task is focused. Best you check them all out under <strong>Settings/Keyboard Shortcuts /Tasks</strong>. The most useful are probably:</p>
          <ul>
          <li>${KEY_COMBO(
            'taskSchedule',
          )}: Schedule task (which can also be navigated by keyboard)</li>
          <li>${KEY_COMBO('taskDelete')}: Delete Task</li>
          <li>${KEY_COMBO('taskToggleDone')}: Toggle done</li>
          <li>${KEY_COMBO('taskAddSubTask')}: Add new sub task</li>
          <li>${KEY_COMBO('togglePlay')}: Toggle tracking</li>
          </ul>

      `,
      buttons: [NEXT_BTN],
    },
    {
      title: 'Congratulations!',
      text: '<p>This concludes the keyboard navigation tour. Remember that you can always start it again via the Help button in the menu.</p><p>Best way to get familiar with the app, is to play around with it. Have fun!</p>',
      buttons: [
        {
          text: 'End Tour',
          classes: PRIMARY_CLASSES,
          action: () => {
            shepherdService.complete();
          },
        } as any,
      ],
    },
  ];
};
