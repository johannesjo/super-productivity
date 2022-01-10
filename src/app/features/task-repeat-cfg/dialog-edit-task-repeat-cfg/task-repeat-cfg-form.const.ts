import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';
import { getWorklogStr } from '../../../util/get-work-log-str';

export const TASK_REPEAT_CFG_FORM_CFG_BASE: FormlyFieldConfig[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.TITLE,
    },
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

export const TASK_REPEAT_CFG_FORM_CFG_REPEAT: FormlyFieldConfig[] = [
  {
    key: 'startDate',
    type: 'input',
    defaultValue: getWorklogStr(),
    templateOptions: {
      label: 'Start date',
      required: true,
      min: getWorklogStr() as any,
      type: 'date',
    },
  },
  {
    key: 'repeatCycle',
    type: 'select',
    defaultValue: 'WEEKLY',
    templateOptions: {
      required: true,
      label: T.F.GITLAB.FORM.SOURCE,
      options: [
        { value: 'DAILY', label: 'DAILY' },
        { value: 'WEEKLY', label: 'WEEKLY' },
        { value: 'MONTHLY', label: 'MONTHLY' },
        { value: 'YEARLY', label: 'YEARLY' },
      ],
    },
  },
  {
    key: 'repeatEvery',
    type: 'input',
    defaultValue: 1,
    templateOptions: {
      label: 'Repeat every X',
      required: true,
      min: 1,
      max: 1000,
      type: 'number',
    },
  },
  {
    key: 'monday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.MONDAY,
    },
  },
  {
    key: 'tuesday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.TUESDAY,
    },
  },
  {
    key: 'wednesday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.WEDNESDAY,
    },
  },
  {
    key: 'thursday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.THURSDAY,
    },
  },
  {
    key: 'friday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.FRIDAY,
    },
  },
  {
    key: 'saturday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.SATURDAY,
    },
  },
  {
    key: 'sunday',
    type: 'checkbox',
    hideExpression: (model: any) => model.repeatCycle !== 'WEEKLY',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.SUNDAY,
    },
  },
];
