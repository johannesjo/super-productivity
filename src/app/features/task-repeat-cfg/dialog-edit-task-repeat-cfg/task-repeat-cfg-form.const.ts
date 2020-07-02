import { FormlyFieldConfig } from '@ngx-formly/core';
import { T } from '../../../t.const';

export const TASK_REPEAT_CFG_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.TITLE
    },
  },
  {
    key: 'defaultEstimate',
    type: 'duration',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.DEFAULT_ESTIMATE
    },
  },
  {
    key: 'monday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.MONDAY
    },
  },
  {
    key: 'tuesday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.TUESDAY
    },
  },
  {
    key: 'wednesday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.WEDNESDAY
    },
  },
  {
    key: 'thursday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.THURSDAY
    },
  },
  {
    key: 'friday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.FRIDAY
    },
  },
  {
    key: 'saturday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.SATURDAY
    },
  },
  {
    key: 'sunday',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.SUNDAY
    },
  },
  {
    key: 'isAddToBottom',
    type: 'checkbox',
    templateOptions: {
      label: T.F.TASK_REPEAT.F.IS_ADD_TO_BOTTOM
    },
  },
];
