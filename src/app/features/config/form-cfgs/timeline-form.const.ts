import { ConfigFormSection, TimelineConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';

export const TIMELINE_FORM_CFG: ConfigFormSection<TimelineConfig> = {
  title: T.GCF.TIMELINE.TITLE,
  help: T.GCF.TIMELINE.HELP,
  key: 'timeline',
  items: [
    {
      key: 'isWorkStartEndEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.TIMELINE.L_IS_WORK_START_END_ENABLED,
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWorkStartEndEnabled,
      key: 'workStart',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.GCF.TIMELINE.L_WORK_START,
        description: T.GCF.TIMELINE.WORK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      hideExpression: (m, v, field) => !field?.model.isWorkStartEndEnabled,
      key: 'workEnd',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.GCF.TIMELINE.L_WORK_END,
        description: T.GCF.TIMELINE.WORK_START_END_DESCRIPTION,
      },
      validators: {
        validTimeString: (c: { value: string | undefined }) => {
          return isValidSplitTime(c.value);
        },
      },
    },
    {
      key: 'calendarProviders',
      type: 'repeat',
      templateOptions: {
        addText: T.F.SIMPLE_COUNTER.FORM.ADD_NEW,
      },
      fieldArray: {
        fieldGroup: [
          {
            type: 'checkbox',
            key: 'isEnabled',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_IS_ENABLED,
            },
          },
          {
            type: 'input',
            key: 'icalUrl',
            templateOptions: {
              label: T.GCF.TIMELINE.L_CAL_PATH,
              description: T.GCF.TIMELINE.L_CAL_PATH_DESCRIPTION,
            },
          },
          {
            type: 'icon',
            key: 'icon',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
            },
          },
        ],
      },
    },
  ],
};
