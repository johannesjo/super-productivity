import Step from 'shepherd.js/src/types/step';
import { ShepherdService } from 'angular-shepherd';
import { waitForEl, waitForObs } from './shepherd-helper';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { distinctUntilChanged, filter, skip, tap } from 'rxjs/operators';
import { promiseTimeout } from '../../util/promise-timeout';

const NEXT_BTN = {
  classes: 'shepherd-button-primary',
  text: 'Next',
  type: 'next',
};

export const SHEPHERD_STANDARD_BTNS = [
  {
    classes: 'shepherd-button-secondary',
    text: 'Exit',
    type: 'cancel',
  },
  {
    classes: 'shepherd-button-primary',
    text: 'Back',
    type: 'back',
  },
  NEXT_BTN,
];

export const SHEPHERD_STEPS = (
  shepherdService: ShepherdService,
  layoutService: LayoutService,
  taskService: TaskService,
): Array<Step.StepOptions> => [
  // TODO remove
  {
    title: 'YXXXXO',
    // beforeShowPromise: () => promiseTimeout(200),
    when: {
      show: () => {
        setTimeout(() => {
          shepherdService.next();
        }, 500);
      },
    },
    buttons: [],
  },
  // {
  //   title: 'Welcome to Super Productivity!!',
  //   text: 'Super Productivity is a ToDo app that helps you to improve your personal workflows.',
  //   buttons: SHEPHERD_STANDARD_BTNS,
  // },
  // {
  //   attachTo: {
  //     element: '.action-nav button',
  //     on: 'bottom',
  //   },
  //   when: {
  //     show: () => {
  //       waitForEl('app-root > add-task-bar input', () => shepherdService.next());
  //     },
  //   },
  //   scrollTo: false,
  //   title: "Let's add your first task!",
  //   text: 'Click on this button or press <kbd>Shift</kbd> + <kbd>a</kbd>',
  //   advanceOn: {
  //     selector: '.action-nav button',
  //     event: 'click',
  //   },
  // },
  //
  // {
  //   attachTo: {
  //     element: 'add-task-bar',
  //     on: 'bottom',
  //   },
  //   beforeShowPromise: () => promiseTimeout(1000),
  //   when: {
  //     show: () => {
  //       waitForEl('task', () => {
  //         layoutService.hideAddTaskBar();
  //         shepherdService.next();
  //       });
  //     },
  //   },
  //   scrollTo: false,
  //   title: 'Enter a title!',
  //   text: 'Enter the title you want to give your task and hit the <kbd>Enter</kbd> key. After that you can press the <kbd>Escape</kbd> key or click anywhere on the grayed out backdrop to leave the add task bar.',
  // },
  // {
  //   title: 'Congrats! This is your first task!',
  //   text: 'Hover over it with your mouse',
  //   attachTo: {
  //     element: 'task',
  //     on: 'bottom',
  //   },
  //   beforeShowPromise: () => promiseTimeout(1000),
  //   when: {
  //     show: () => {
  //       setTimeout(() => {
  //         waitForEl('task .hover-controls', () => shepherdService.next());
  //       }, 1000);
  //     },
  //   },
  // },
  // {
  //   title: 'Start Tracking',
  //   attachTo: {
  //     element: '.start-task-btn',
  //     on: 'bottom',
  //   },
  //   text: 'Pressing the play button will start your first time tracking session. Time tracking is useful since it allows you to get a better idea on how you spend your time.',
  //   //   attachTo: {
  //   //     element: 'add-task-bar',
  //   //     on: 'bottom',
  //   //   },
  //
  //   ...waitForObs(taskService.currentTaskId$.pipe(filter((id) => !!id)), () =>
  //     shepherdService.next(),
  //   ),
  //
  // },
  // {
  //   title: 'Stop Tracking',
  //   text: 'To stop tracking click on the pause button.',
  //   attachTo: {
  //     element: '.start-task-btn',
  //     on: 'bottom',
  //   },
  //   ...waitForObs(taskService.currentTaskId$.pipe(filter((id) => !id)), () =>
  //     shepherdService.next(),
  //   ),
  // },
  // {
  //   title: 'Edit Task Title',
  //   text: 'You can edit the task title by clicking on it. Do this now and change the title to something else!',
  //   attachTo: {
  //     element: '.task-title',
  //     on: 'bottom',
  //   },
  //   advanceOn: {
  //     selector: '.task-title',
  //     event: 'blur',
  //   },
  // },
  // {
  //   title: 'Task Side Panel',
  //   text: 'There is more you you can do with task. Hover over the task you created with your mouse again.',
  //   buttons: [],
  //   attachTo: {
  //     element: 'task',
  //     on: 'bottom',
  //   },
  //   beforeShowPromise: () => promiseTimeout(500),
  //   when: {
  //     show: () => {
  //       setTimeout(() => {
  //         waitForEl('task .hover-controls', () => shepherdService.next());
  //       }, 200);
  //     },
  //   },
  // },
  // {
  //   title: 'Opening Task Side Panel',
  //   attachTo: {
  //     element: '.show-additional-info-btn',
  //     on: 'bottom',
  //   },
  //   text: 'You can open a panel with additional controls by clicking on the button. Alternatively you can press the <kbd>➔</kbd> key when a task is focused.',
  //   buttons: [],
  //   ...waitForObs(
  //     taskService.selectedTask$.pipe(filter((selectedTask) => !!selectedTask)),
  //     () => shepherdService.next(),
  //   ),
  // },
  // {
  //   title: 'The Task Side Panel',
  //   text: 'In the task side panel you can adjust estimates, schedule your task, add a description or attachments or configure your task to be repeated.',
  //   buttons: [NEXT_BTN],
  // },
  // {
  //   title: 'Closing the Task Side Panel',
  //   text: 'You can close the panel by clicking the X or by pressing <kbd>←</kbd>. Do this now!',
  //   attachTo: {
  //     element: '.show-additional-info-btn',
  //     on: 'bottom',
  //   },
  //   ...waitForObs(
  //     taskService.selectedTask$.pipe(filter((selectedTask) => !selectedTask)),
  //     () => shepherdService.next(),
  //   ),
  // },
  {
    title: 'Deleting a Task',
    text: 'To delete a task you need to open the task context menu.',
    when: {
      show: () => {
        waitForEl('mat-menu-panel', () => shepherdService.next());
      },
    },
  },
  {
    title: 'These are the basics',
    text: 'Best',

    buttons: [],
  },
];
