/* eslint-disable max-len */
import { ConfigFormSection, TakeABreakConfig } from '../global-config.model';
import { T } from '../../../t.const';

export const TAKE_A_BREAK_FORM_CFG: ConfigFormSection<TakeABreakConfig> = {
  title: T.GCF.TAKE_A_BREAK.TITLE,
  key: 'takeABreak',
  help: T.GCF.TAKE_A_BREAK.HELP,
  items: [
    {
      key: 'isTakeABreakEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.IS_ENABLED,
      },
    },
    {
      key: 'isLockScreen',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.IS_LOCK_SCREEN,
      },
    },
    {
      key: 'isFocusWindow',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.IS_FOCUS_WINDOW,
      },
    },
    {
      key: 'takeABreakMinWorkingTime',
      type: 'duration',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.MIN_WORKING_TIME,
        required: true,
      },
    },
    {
      key: 'takeABreakSnoozeTime',
      type: 'duration',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.SNOOZE_TIME,
        required: true,
      },
    },
    {
      key: 'takeABreakMessage',
      type: 'textarea',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.MESSAGE,
      },
    },
    {
      key: 'motivationalImg',
      type: 'input',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.MOTIVATIONAL_IMG,
      },
    },
  ],
};
