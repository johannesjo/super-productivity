/* eslint-disable max-len */
import { ConfigFormSection, PomodoroConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const POMODORO_FORM_CFG: ConfigFormSection<PomodoroConfig> = {
  title: T.GCF.POMODORO.TITLE,
  key: 'pomodoro',
  help: T.GCF.POMODORO.HELP,
  items: [
    {
      key: 'isEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.POMODORO.IS_ENABLED,
      },
    },
    {
      key: 'isStopTrackingOnBreak',
      type: 'checkbox',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.IS_STOP_TRACKING_ON_BREAK,
      },
    },
    {
      key: 'isManualContinue',
      type: 'checkbox',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.IS_MANUAL_CONTINUE,
      },
    },
    {
      key: 'isManualContinueBreak',
      type: 'checkbox',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.IS_MANUAL_CONTINUE_BREAK,
      },
    },
    {
      key: 'isPlaySound',
      type: 'checkbox',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.IS_PLAY_SOUND,
      },
    },
    {
      key: 'isPlaySoundAfterBreak',
      type: 'checkbox',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.IS_PLAY_SOUND_AFTER_BREAK,
      },
    },
    {
      key: 'isPlayTick',
      type: 'checkbox',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.IS_PLAY_TICK,
      },
    },
    {
      key: 'duration',
      type: 'duration',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        required: true,
        label: T.GCF.POMODORO.DURATION,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'breakDuration',
      type: 'duration',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        required: true,
        label: T.GCF.POMODORO.BREAK_DURATION,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'longerBreakDuration',
      type: 'duration',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        required: true,
        label: T.GCF.POMODORO.LONGER_BREAK_DURATION,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'cyclesBeforeLongerBreak',
      type: 'input',
      hideExpression: (model: any) => !model.isEnabled,
      templateOptions: {
        label: T.GCF.POMODORO.CYCLES_BEFORE_LONGER_BREAK,
        type: 'number',
        min: 1,
      },
    },
  ],
};
/* eslint-enable max-len */
