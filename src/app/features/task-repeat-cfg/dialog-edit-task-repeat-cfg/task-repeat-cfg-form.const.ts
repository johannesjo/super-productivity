import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { TASK_REMINDER_OPTIONS } from '../../tasks/dialog-add-task-reminder/task-reminder-options.const';

export const TASK_REPEAT_CFG_FORM_CFG: FormlyFieldConfig[] = [
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
  {
    key: 'isAddToBottom',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.IS_ADD_TO_BOTTOM,
    },
  },
];
