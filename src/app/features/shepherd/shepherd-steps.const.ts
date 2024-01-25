import Step from 'shepherd.js/src/types/step';
import { ShepherdService } from 'angular-shepherd';
import { nextOnObs, twoWayObs, waitForEl } from './shepherd-helper';
import { LayoutService } from '../../core-ui/layout/layout.service';
import { TaskService } from '../tasks/task.service';
import { filter, first } from 'rxjs/operators';
import { promiseTimeout } from '../../util/promise-timeout';
import { Actions, ofType } from '@ngrx/effects';
import { addTask, deleteTask } from '../tasks/store/task.actions';
import { GlobalConfigState } from '../config/global-config.model';
import { IS_MOUSE_PRIMARY } from '../../util/is-mouse-primary';
import { hideAddTaskBar } from '../../core-ui/layout/store/layout.actions';

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
  cfg: GlobalConfigState,
  actions$: Actions,
  layoutService: LayoutService,
  taskService: TaskService,
): Array<Step.StepOptions> => [
  // {
  //   title: 'Welcome to Super Productivity!!',
  //   text: 'Super Productivity is a ToDo app that helps you to improve your personal workflows.',
  //   buttons: SHEPHERD_STANDARD_BTNS,
  // },
  {
    title: "Let's add your first task!",
    text: IS_MOUSE_PRIMARY
      ? `Click on this button or press <kbd>${cfg.keyboard.addNewTask}</kbd>.`
      : 'Tap on the button with the +',
    attachTo: {
      element: '.action-nav button',
      on: 'bottom',
    },
    ...nextOnObs(layoutService.isShowAddTaskBar$.pipe(filter((v) => v)), shepherdService),
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
      // delay because other hide should trigger first
      { obs: actions$.pipe(ofType(hideAddTaskBar)) },
      shepherdService,
    ),
  },
  {
    title: 'Close the Add Task Bar!',
    text: IS_MOUSE_PRIMARY
      ? 'Press the <kbd>Escape</kbd> key twice or click anywhere on the grayed out backdrop to leave the add task bar.'
      : 'Tap anywhere on the grayed out backdrop to leave the add task bar.',
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
    text: "Let's continue with another subject.",
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
    text: 'Time tracking is useful as it allows you to get a better idea on how you spend your time. It will enable you to make better estimates and can improve how you work.<br>Pressing the play button in the top right corner will start your first time tracking session.',
    attachTo: {
      element: '.play-btn',
      on: 'bottom',
    },
    ...nextOnObs(taskService.currentTaskId$.pipe(filter((id) => !!id)), shepherdService),
  },
  {
    title: 'Stop Tracking Time',
    text: 'To stop tracking click on the pause button.',
    attachTo: {
      element: '.play-btn',
      on: 'bottom',
    },
    ...nextOnObs(taskService.currentTaskId$.pipe(filter((id) => !id)), shepherdService),
  },
  ...(IS_MOUSE_PRIMARY
    ? [
        {
          title: 'Edit Task Title',
          text: 'You can edit the task title by clicking on it. Do this now and change the title to something else!',
          attachTo: {
            element: '.task-title',
            on: 'bottom' as any,
          },
          advanceOn: {
            selector: '.task-title',
            event: 'blur',
          },
        },
        {
          title: 'Task Side Panel',
          text: 'There is more you you can do with task. Hover over the task you created with your mouse again.',
          attachTo: {
            element: 'task',
            on: 'bottom' as any,
          },
          when: {
            show: () => {
              setTimeout(() => {
                waitForEl('task .hover-controls', () => shepherdService.next());
              }, 200);
            },
          },
        },
        {
          title: 'Opening Task Side Panel',
          attachTo: {
            element: '.show-additional-info-btn',
            on: 'bottom' as any,
          },
          text: 'You can open a panel with additional controls by clicking on the button. Alternatively you can press the <kbd>➔</kbd> key when a task is focused.',
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
    text: 'This is the task side panel.Here you can adjust estimates, schedule your task, add a description or attachments or configure your task to be repeated.',
    buttons: [NEXT_BTN],
    beforeShowPromise: () => promiseTimeout(1000),
  },
  {
    title: 'Closing the Task Side Panel',
    text: IS_MOUSE_PRIMARY
      ? 'You can close the panel by clicking the X or by pressing <kbd>←</kbd>. Do this now!'
      : 'You can close the panel by tapping on the x',
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
    title: 'Deleting a Task',
    text: IS_MOUSE_PRIMARY
      ? // eslint-disable-next-line max-len
        `To delete a task you need to open the task context menu. To do so right click (or long press on Mac and Mobile) and select "Delete Task". Alternatively you can focus the task by clicking on it and pressing the <kbd>${cfg.keyboard.taskDelete}</kbd> key`
      : 'To delete a task you need to open the task context menu. To do so long press and select "Delete Task" in the menu that opens up.',
    attachTo: {
      element: 'task',
      on: 'bottom',
    },
    when: {
      show: () => {
        setTimeout(() => {
          (document.querySelector('task') as HTMLElement)?.focus();
        }, 200);
        setTimeout(() => {
          (document.querySelector('task') as HTMLElement)?.focus();
        }, 1000);
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
    title: 'Th are the basics',
    text: 'Best',
  },
];
