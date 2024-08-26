import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { TASK_REMINDER_OPTIONS } from '../../planner/dialog-schedule-task/task-reminder-options.const';
import { getWorklogStr } from '../../../util/get-work-log-str';
import { RepeatQuickSetting, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getQuickSettingUpdates } from './get-quick-setting-updates';

const updateParent = (
  field: FormlyFieldConfig,
  changes: Partial<TaskRepeatCfg>,
): void => {
  // possibly better?
  field.form?.patchValue({
    // ...field.parent.model,
    ...changes,
  } as any);
};

export const TASK_REPEAT_CFG_FORM_CFG_BEFORE_TAGS: FormlyFieldConfig[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.TITLE,
    },
  },
  {
    key: 'quickSetting',
    type: 'select',
    defaultValue: 'DAILY',
    templateOptions: {
      required: true,
      label: T.F.TASK_REPEAT.F.QUICK_SETTING,
      // NOTE replaced in component to allow for dynamic translation
      options: [
        // { value: 'DAILY', label: 'DAILY' },
        // { value: 'WEEKLY_CURRENT_WEEKDAY', label: 'WEEKLY_CURRENT_WEEKDAY' },
        // { value: 'MONTHLY_CURRENT_DATE', label: 'MONTHLY_CURRENT_DATE' },
        // { value: 'MONDAY_TO_FRIDAY', label: 'MONDAY_TO_FRIDAY' },
        // { value: 'YEARLY_CURRENT_DATE', label: 'YEARLY_CURRENT_DATE' },
        // { value: 'CUSTOM', label: 'CUSTOM' },
      ],
      change: (field, event) => {
        const updatesForQuickSetting = getQuickSettingUpdates(
          event.value as RepeatQuickSetting,
        );
        if (updatesForQuickSetting) {
          // NOTE: for some reason this doesn't update the model value, just the view value :(
          updateParent(field, updatesForQuickSetting);
        }
      },
    },
  },

  // REPEAT CUSTOM CFG
  {
    fieldGroupClassName: 'repeat-cycle',
    hideExpression: (model: any) => model.quickSetting !== 'CUSTOM',
    fieldGroup: [
      {
        key: 'repeatEvery',
        type: 'input',
        defaultValue: 1,
        templateOptions: {
          label: T.F.TASK_REPEAT.F.REPEAT_EVERY,
          required: true,
          min: 1,
          max: 1000,
          type: 'number',
        },
      },
      {
        key: 'repeatCycle',
        type: 'select',
        defaultValue: 'WEEKLY',
        templateOptions: {
          required: true,
          label: T.F.TASK_REPEAT.F.REPEAT_CYCLE,
          options: [
            { value: 'DAILY', label: T.F.TASK_REPEAT.F.C_DAY },
            { value: 'WEEKLY', label: T.F.TASK_REPEAT.F.C_WEEK },
            { value: 'MONTHLY', label: T.F.TASK_REPEAT.F.C_MONTH },
            { value: 'YEARLY', label: T.F.TASK_REPEAT.F.C_YEAR },
          ],
        },
      },
    ],
  },
  {
    key: 'startDate',
    type: 'input',
    hideExpression: (model: any) => model.quickSetting !== 'CUSTOM',
    defaultValue: getWorklogStr(),
    templateOptions: {
      label: T.F.TASK_REPEAT.F.START_DATE,
      required: true,
      // min: getWorklogStr() as any,
      type: 'date',
    },
  },
  {
    fieldGroupClassName: 'weekdays',
    hideExpression: (model: any) =>
      model.quickSetting !== 'CUSTOM' || model.repeatCycle !== 'WEEKLY',
    fieldGroup: [
      {
        key: 'monday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.MONDAY,
        },
      },
      {
        key: 'tuesday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.TUESDAY,
        },
      },
      {
        key: 'wednesday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.WEDNESDAY,
        },
      },
      {
        key: 'thursday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.THURSDAY,
        },
      },
      {
        key: 'friday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.FRIDAY,
        },
      },
      {
        key: 'saturday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.SATURDAY,
        },
      },
      {
        key: 'sunday',
        type: 'checkbox',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.SUNDAY,
        },
      },
    ],
  },
  // REPEAT CFG END

  {
    fieldGroupClassName: 'formly-row',
    fieldGroup: [
      {
        key: 'startTime',
        type: 'input',
        templateOptions: {
          label: T.F.TASK_REPEAT.F.START_TIME,
          description: T.F.TASK_REPEAT.F.START_TIME_DESCRIPTION,
        },
        validators: {
          validTimeString: (c: { value: string | undefined }) => {
            return !c.value || isValidSplitTime(c.value);
          },
        },
      },
      {
        key: 'remindAt',
        type: 'select',
        hideExpression: '!model.startTime',
        templateOptions: {
          required: true,
          label: T.F.TASK_REPEAT.F.REMIND_AT,
          options: TASK_REMINDER_OPTIONS,
          valueProp: 'value',
          labelProp: 'label',
          placeholder: T.F.TASK_REPEAT.F.REMIND_AT_PLACEHOLDER,
        },
      },
    ],
  },
  {
    key: 'defaultEstimate',
    type: 'duration',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.DEFAULT_ESTIMATE,
      description: T.G.DURATION_DESCRIPTION,
    },
  },
  {
    key: 'order',
    type: 'input',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.ORDER,
      type: 'number',
      description: T.F.TASK_REPEAT.F.ORDER_DESCRIPTION,
    },
  },
];

export const TASK_REPEAT_CFG_ADVANCED_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'notes',
    type: 'textarea',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.NOTES,
      rows: 4,
    },
  },
];
