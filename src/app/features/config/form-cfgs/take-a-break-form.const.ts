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
      key: 'isTimedFullScreenBlocker',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.IS_FULL_SCREEN_BLOCKER,
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
      hideExpression: (model: any) => !model.isTimedFullScreenBlocker,
      key: 'timedFullScreenBlockerDuration',
      type: 'duration',
      templateOptions: {
        required: true,
        isAllowSeconds: true,
        label: T.GCF.TAKE_A_BREAK.FULL_SCREEN_BLOCKER_DURATION,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'takeABreakMinWorkingTime',
      type: 'duration',
      expressionProperties: { 'templateOptions.required': 'model.isTakeABreakEnabled' },
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.MIN_WORKING_TIME,
        required: true,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'takeABreakSnoozeTime',
      type: 'duration',
      expressionProperties: { 'templateOptions.required': 'model.isTakeABreakEnabled' },
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.SNOOZE_TIME,
        required: true,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      key: 'takeABreakMessage',
      type: 'textarea',
      expressionProperties: { 'templateOptions.required': 'model.isTakeABreakEnabled' },
      templateOptions: {
        label: T.GCF.TAKE_A_BREAK.MESSAGE,
      },
    },
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'sub-section-heading',
        // text: T.GCF.KEYBOARD.APP_WIDE_SHORTCUTS,
        // text: 'Motivational Images',
        text: T.GCF.TAKE_A_BREAK.MOTIVATIONAL_IMG,
      },
    },
    {
      key: 'motivationalImgs',
      expressionProperties: { 'templateOptions.required': 'model.isTakeABreakEnabled' },
      type: 'repeat',
      templateOptions: {
        // addText: T.F.SIMPLE_COUNTER.FORM.ADD_NEW,
        addText: 'Add motivational image',
        required: true,
      },
      fieldArray: {
        defaultValue: 'XXXXX1',
        type: 'input',
        expressionProperties: {
          'templateOptions.label': '"Fruitname " + field.key',
        },
        templateOptions: {
          defaultValue: 'AAAAAAAA',
          required: true,
          placeholder: T.GCF.TAKE_A_BREAK.MOTIVATIONAL_IMG,
          type: 'url',
          // change: (...args) => console.log(args),
          keypress: (...args) => console.log(args),
        },
      },
    },
  ],
};
