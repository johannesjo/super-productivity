// tslint:disable:max-line-length
import { ConfigFormSection } from '../config.model';

export const POMODORO_FORM_CFG: ConfigFormSection = {
  title: 'Pomodoro Settings',
  key: 'pomodoro',
  help: ``,
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
    {
      key: 'isStopTrackingOnLongBreak',
      type: 'checkbox',
      templateOptions: {
        label: 'Stop time tracking for task on a long break',
      },
    },
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
