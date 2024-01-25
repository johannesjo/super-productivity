import Step from 'shepherd.js/src/types/step';
import { ShepherdService } from 'angular-shepherd';
import { nextOnObs, twoWayObs, waitForEl } from './shepherd-helper';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { filter, first, map, startWith } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { addTask, deleteTask, updateTask } from '../tasks/store/task.actions';
import { GlobalConfigState } from '../config/global-config.model';
import { IS_MOUSE_PRIMARY } from '../../util/is-mouse-primary';
import { NavigationEnd, Router } from '@angular/router';
import { promiseTimeout } from '../../util/promise-timeout';
import { hideAddTaskBar } from '../../core-ui/layout/store/layout.actions';
import { LS } from '../../core/persistence/storage-keys.const';

const NEXT_BTN = {
  classes: 'shepherd-button-primary',
  text: 'Next',
  type: 'next',
};

const CANCEL_BTN: any = (shepherdService: ShepherdService) => ({
  classes: 'shepherd-button-secondary',
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
  Sync = 'Sync',
  AdvancedStuffChoice = 'AdvancedStuffChoice',
  Calendars = 'Calendars',
  IssueProviders = 'IssueProviders',
  Project = 'Project',
  FinishDay = 'FinishDay',
  StartTourAgain = 'StartTourAgain',
}

export const SHEPHERD_STEPS = (
  shepherdService: ShepherdService,
  cfg: GlobalConfigState,
  actions$: Actions,
  layoutService: LayoutService,
  taskService: TaskService,
  router: Router,
): Array<Step.StepOptions> => {
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
        ? `<em>Click</em> on this button or press <kbd>${cfg.keyboard.addNewTask}</kbd>.`
        : '<em>Tap</em> on the button with the +',
      attachTo: {
        element: '.tour-addBtn',
        on: 'bottom',
      },
      ...nextOnObs(
        layoutService.isShowAddTaskBar$.pipe(filter((v) => v)),
        shepherdService,
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
            title: 'Edit Task Title',
            text: '<p>You can edit the task title by clicking on it. Do this now and change the task title to something else.',
            attachTo: {
              element: '.task-title',
              on: 'bottom' as any,
            },
            ...nextOnObs(actions$.pipe(ofType(updateTask)), shepherdService, () => {}),
          },
          {
            title: 'Task Hover Menu',
            text: 'There is more you you can do with a task. Hover over the task you created with your mouse again.',
            attachTo: {
              element: 'task',
              on: 'bottom' as any,
            },
            beforeShowPromise: () => promiseTimeout(500),
            when: {
              show: () => {
                setTimeout(() => {
                  waitForEl('task .hover-controls', () => shepherdService.next());
                }, 3200);
              },
            },
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
    {
      id: 'DDDD',
      title: 'Deleting a Task',
      text: IS_MOUSE_PRIMARY
        ? // eslint-disable-next-line max-len
          `To delete a task you need to open the task context menu. To do so right <em>click</em> on it (or long press on Mac and Mobile) and select "<strong>Delete Task</strong>".`
        : 'To delete a task you need to open the task context menu. To do so long press and select "<strong>Delete Task</strong>" in the menu that opens up.',
      attachTo: {
        element: 'task',
        on: 'bottom',
      },
      when: {
        show: () => {
          waitForEl('.mat-menu-panel', () => {
            shepherdService.hide();
          });
          actions$
            .pipe(ofType(deleteTask), first())
            .subscribe(() => shepherdService.next());
        },
      },
    },
    {
      title: 'Great job!',
      text: 'That covers the basics. Let`s continue with another important subject: <strong>Syncing</strong>!',
      buttons: [NEXT_BTN],
    },
    {
      id: TourId.Sync,
      title: 'Syncing & Data Privacy',
      text: "<p>Super Productivity takes your data privacy very serious. This means that <strong>you decide what will be saved and where</strong>. <strong>The app does NOT collect any data </strong> and there are no user accounts or registration required. It's free and open source and always will be.</p><p>This is important since data is often sold for marketing purposes and leaks happen more often than you would think.</p><p>With Super Productivity <strong>you can save and sync your data with a cloud provider of your choosing</strong> or even host it in your own cloud.</p><p>Let me show you where to configure this!!</p>",
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Skip',
          action: () => {
            shepherdService.show(TourId.Welcome);
          },
        } as any,
        NEXT_BTN,
      ],
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
          startWith(router.url.includes('config')),
          filter((v) => !!v),
        ),
        shepherdService,
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
      when: {
        show: () => {
          waitForEl('.tour-isSyncEnabledToggle', () => shepherdService.next());
        },
      },
    },
    {
      title: 'Configure Sync',
      text: '<p>Here you should be able to configure a sync provider of your choosing. For most people <a href="https://www.dropbox.com/" target="_blank"><strong>Dropbox</strong></a> is probably the easiest solution, that also will offer you automatic backups in the cloud.</p><p>If you have the desktop or Android version of Super Productivity <strong>LocalFile</strong> is another good option. It will let you configure a file path to sync to. You can then sync this file with any provider you like.</p><p>The option <strong>WebDAV</strong> can be used to sync with Nextcloud and others.</p>',
      buttons: [NEXT_BTN],
    },
    {
      title: 'Configure Sync',
      text: 'This covers syncing. If you have any questions you can always ask them <a href="https://github.com/johannesjo/super-productivity/discussions">on the projects GitHub page</a>. ',
      buttons: [NEXT_BTN],
    },
    //     {
    //       id: TourId.AdvancedStuffChoice,
    //       title: 'Advanced Tutorials',
    //       classes: 'shepherd-wider',
    //       text: `<p>This covers the most important stuff. There are more advanced tutorials for the following subjects available:</p>
    // <ul class="shepherd-nav-list">
    // <li><a href="${TourId.Calendars}">Connect your to your Calendars (e.g. Google Calendar, Outlook)</a></li>
    // <li><a href="${TourId.IssueProviders}">Connect to Issue Providers like Jira, OpenProject, GitHub, GitLab, Redmine or Gitea</a></li>
    // <!--<li><a href="#">How to manage Projects</a></li>-->
    // <!--<li><a href="#">How to use keyboard shortcuts in the most efficient way</a></li>-->
    // </ul>
    // <p class="shepherd-nav-list">Or <a href="${TourId.Welcome}">restart the welcome tour</a>.</p>
    // `,
    //       when: {
    //         show: () => {
    //           const nl = document.querySelectorAll('.shepherd-nav-list a');
    //           if (!nl?.length) {
    //             return;
    //           }
    //           const goTo = (ev: Event): void => {
    //             ev.preventDefault();
    //             const el = ev.target as HTMLElement;
    //             shepherdService.show(el.getAttribute('href') as string);
    //           };
    //           Array.from(nl).forEach((node) => node.addEventListener('click', goTo));
    //         },
    //       },
    //       CANCEL_BTN
    //     },
    {
      id: TourId.StartTourAgain,
      title: 'Show again?',
      text: 'Do you want to show the tour again the next time you start the app? You can always show the tour again via the help button in the left menu.',
      buttons: [
        {
          classes: 'shepherd-button-secondary',
          text: 'Never show again',
          action: () => {
            localStorage.setItem(LS.IS_SHOW_TOUR, 'true');
            shepherdService.complete();
          },
        } as any,
        {
          text: 'Show it again',
          action: () => {
            localStorage.removeItem(LS.IS_SHOW_TOUR);
            shepherdService.complete();
          },
        } as any,
      ],
    },
  ];
};

/*
Or by pressing <kbd>Enter</kbd> when a task is focused with the keyboard which is indicated by a <span class="shepherd-colored">colored border</span>.</p><p>Do this now and <strong>change the title to something else!</strong></p>
 Alternatively you can press the <kbd>➔</kbd> key when a task is focused.

 Alternatively you can focus the task by clicking on it and pressing the <kbd>${cfg.keyboard.taskDelete}</kbd> key

  or by pressing <kbd>←</kbd>
 */
