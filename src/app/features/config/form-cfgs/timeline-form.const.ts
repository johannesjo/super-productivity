import { ConfigFormSection, TimelineConfig } from '../global-config.model';
import { T } from '../../../t.const';
import { isValidSplitTime } from '../../../util/is-valid-split-time';
import { IS_ELECTRON } from '../../../app.constants';

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
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'h3',
        class: 'extra-margin-top',
        text: T.GCF.TIMELINE.CAL_PROVIDERS,
      },
    },
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'p',
        text: T.GCF.TIMELINE.CAL_PROVIDERS_INFO,
      },
    },
    ...(!IS_ELECTRON
      ? [
          {
            type: 'tpl',
            className: 'tpl',
            templateOptions: {
              tag: 'p',
              text: T.GCF.TIMELINE.BROWSER_WARNING,
            },
          },
        ]
      : []),
    {
      key: 'calendarProviders',
      type: 'repeat',
      templateOptions: {
        addText: T.GCF.TIMELINE.CAL_PROVIDERS_ADD,
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
