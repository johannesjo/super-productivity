import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { getWorklogStr } from '../../../util/get-work-log-str';
import {
  RepeatQuickSetting,
  TASK_REPEAT_WEEKDAY_MAP,
  TaskRepeatCfg,
} from '../task-repeat-cfg.model';

const updateParent = (
  field: FormlyFieldConfig,
  changes: Partial<TaskRepeatCfg>,
): void => {
  field.parent?.formControl?.patchValue({
    ...field.parent.model,
    ...changes,
  });
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
        // field.formControl?.patchValue(event.value);
        switch (event.value as RepeatQuickSetting) {
          case 'DAILY': {
            updateParent(field, {
              repeatCycle: 'DAILY',
              repeatEvery: 1,
              startDate: getWorklogStr(),
            });
            break;
          }

          case 'WEEKLY_CURRENT_WEEKDAY': {
            const todayWeekdayStr = TASK_REPEAT_WEEKDAY_MAP[new Date().getDay()];
            updateParent(field, {
              repeatCycle: 'WEEKLY',
              repeatEvery: 1,
              startDate: getWorklogStr(),
              monday: false,
              tuesday: false,
              wednesday: false,
              thursday: false,
              friday: false,
              saturday: false,
              sunday: false,
              [todayWeekdayStr as keyof TaskRepeatCfg]: true,
            });

            break;
          }

          case 'MONDAY_TO_FRIDAY': {
            updateParent(field, {
              repeatCycle: 'WEEKLY',
              repeatEvery: 1,
              startDate: getWorklogStr(),
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false,
            });
            break;
          }

          case 'MONTHLY_CURRENT_DATE': {
            updateParent(field, {
              repeatCycle: 'MONTHLY',
              repeatEvery: 1,
              startDate: getWorklogStr(),
            });
            break;
          }

          case 'YEARLY_CURRENT_DATE': {
            updateParent(field, {
              repeatCycle: 'YEARLY',
              repeatEvery: 1,
              startDate: getWorklogStr(),
            });
            break;
          }

          case 'CUSTOM':
          default:
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
      label: T.F.TASK_REPEAT.F.TITLE,
      rows: 5,
    },
  },
];
