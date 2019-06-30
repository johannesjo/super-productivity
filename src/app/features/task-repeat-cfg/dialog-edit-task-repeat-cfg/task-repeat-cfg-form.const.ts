import {FormlyFieldConfig} from '@ngx-formly/core';

export const TASK_REPEAT_CFG_FORM_CFG: FormlyFieldConfig[] = [
  {
    key: 'title',
    type: 'input',
    templateOptions: {
      label: 'Title for task',
    },
  },
  {
    key: 'defaultEstimate',
    type: 'duration',
    templateOptions: {
      label: 'Default Estimate',
    },
  },
  {
    key: 'monday',
    type: 'checkbox',
    templateOptions: {
      label: 'Monday',
    },
  },
  {
    key: 'tuesday',
    type: 'checkbox',
    templateOptions: {
      label: 'Tuesday',
    },
  },
  {
    key: 'wednesday',
    type: 'checkbox',
    templateOptions: {
      label: 'Wednesday',
    },
  },
  {
    key: 'thursday',
    type: 'checkbox',
    templateOptions: {
      label: 'Thursday',
    },
  },
  {
    key: 'friday',
    type: 'checkbox',
    templateOptions: {
      label: 'Friday',
    },
  },
  {
    key: 'saturday',
    type: 'checkbox',
    templateOptions: {
      label: 'Saturday',
    },
  },
  {
    key: 'sunday',
    type: 'checkbox',
    templateOptions: {
      label: 'Sunday',
    },
  },
];
