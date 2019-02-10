// tslint:disable:max-line-length
import { ConfigFormSection } from '../config.model';

export const POMODORO_FORM_CFG: ConfigFormSection = {
  title: 'Pomodoro Settings',
  key: 'pomodoro',
  /* tslint:disable */
  help: `<p>The pomodoro timer can be configured via a couple of settings. The duration of every work session, the duration of normal breaks, the number of work sessions to run before a longer break is started and the duration of this longer break.</p>
  <p>You can also set if you want to display your distractions during your pomodoro breaks.</p>
  <p>Setting "Pause time tracking on pomodoro break" will also track your breaks as work time spent on a task. </p>
  <p>Enabling "Pause pomodoro session when no active task" will also pause the pomodoro session, when you pause a task.</p>`,
  /* tslint:enable */
  items: [
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: 'Enable pomodoro timer',
      },
    },
    {
      key: 'isStopTrackingOnBreak',
      type: 'checkbox',
      templateOptions: {
        label: 'Stop time tracking for task on break',
      },
    },
    // {
    //   key: 'isStopTrackingOnLongBreak',
    //   type: 'checkbox',
    //   templateOptions: {
    //     label: 'Stop time tracking for task on a long break',
    //   },
    // },
    {
      key: 'isManualContinue',
      type: 'checkbox',
      templateOptions: {
        label: 'Manually confirm starting next pomodoro session',
      },
    },
    {
      key: 'isPlaySound',
      type: 'checkbox',
      templateOptions: {
        label: 'Play sound when session is done',
      },
    },
    {
      key: 'isPlaySoundAfterBreak',
      type: 'checkbox',
      templateOptions: {
        label: 'Play sound when break is done',
      },
    },
    {
      key: 'isPlayTick',
      type: 'checkbox',
      templateOptions: {
        label: 'Play tick sound every second',
      },
    },
    {
      key: 'duration',
      type: 'duration',
      templateOptions: {
        label: 'Duration of work sessions',
      },
    },
    {
      key: 'breakDuration',
      type: 'duration',
      templateOptions: {
        label: 'Duration of short breaks',
      },
    },
    {
      key: 'longerBreakDuration',
      type: 'duration',
      templateOptions: {
        label: 'Duration of longer breaks',
      },
    },
    {
      key: 'cyclesBeforeLongerBreak',
      type: 'input',
      templateOptions: {
        label: 'Start longer break after X work sessions',
        type: 'number',
        min: 1,
      },
    },
  ]
};
// tslint:enable:max-line-length
