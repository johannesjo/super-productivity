import { CalendarIntegrationConfig, ConfigFormSection } from '../global-config.model';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';

export const CALENDAR_FORM_CFG: ConfigFormSection<CalendarIntegrationConfig> = {
  // title: T.GCF.TIMELINE.TITLE,
  title: 'Calendar',
  help: T.GCF.TIMELINE.HELP,
  key: 'calendarIntegration',
  items: [
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
        // addText: T.GCF.TIMELINE.CAL_PROVIDERS_ADD,
        addText: 'Add calendarIntegration',
      },
      fieldArray: {
        fieldGroup: [
          {
            type: 'toggle',
            key: 'isEnabled',
            hooks: {
              onInit: (field) => {
                if (field?.formControl?.value === null) {
                  field.formControl.setValue(true);
                }
              },
            },
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_IS_ENABLED,
            },
          },
          {
            type: 'input',
            key: 'icalUrl',
            templateOptions: {
              required: true,
              // label: T.GCF.TIMELINE.L_CAL_PATH,
              label: 'URL or File path for calendarIntegration ICAL',
            },
          },
          {
            type: 'icon',
            key: 'icon',
            hooks: {
              onInit: (field) => {
                if (field?.formControl?.value === null) {
                  field.formControl.setValue('event');
                }
              },
            },
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
            },
          },
          {
            type: 'duration',
            key: 'checkUpdatesEvery',
            hooks: {
              onInit: (field) => {
                if (field?.formControl?.value === null) {
                  field.formControl.setValue(60 * 60000);
                }
              },
            },
            templateOptions: {
              required: false,
              // label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
              label: 'Check for remote updates every X',
              description: T.G.DURATION_DESCRIPTION,
            },
          },
          {
            type: 'duration',
            key: 'showBannerBeforeThreshold',
            hooks: {
              onInit: (field) => {
                if (field?.formControl?.value === null) {
                  field.formControl.setValue(5 * 60000);
                }
              },
            },
            templateOptions: {
              isAllowSeconds: true,
              // label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
              label: 'Show a notification X before the event (blank for disabled)',
              description: T.G.DURATION_DESCRIPTION,
            },
          },
          {
            type: 'project-select',
            key: 'defaultProjectId',
            templateOptions: {
              // label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
              label: 'Default project id when adding tasks',
            },
          },
        ],
      },
    },
  ],
};
