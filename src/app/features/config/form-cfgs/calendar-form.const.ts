import { CalendarIntegrationConfig, ConfigFormSection } from '../global-config.model';
import { T } from '../../../t.const';
import { IS_ELECTRON } from '../../../app.constants';
import { nanoid } from 'nanoid';

export const CALENDAR_FORM_CFG: ConfigFormSection<CalendarIntegrationConfig> = {
  title: T.GCF.CALENDARS.TITLE,
  help: T.GCF.CALENDARS.HELP,
  key: 'calendarIntegration',
  items: [
    {
      type: 'tpl',
      className: 'tpl',
      templateOptions: {
        tag: 'p',
        text: T.GCF.CALENDARS.CAL_PROVIDERS_INFO,
      },
    },
    ...(!IS_ELECTRON
      ? [
          {
            type: 'tpl',
            className: 'tpl',
            templateOptions: {
              tag: 'p',
              text: T.GCF.CALENDARS.BROWSER_WARNING,
            },
          },
        ]
      : []),
    {
      key: 'calendarProviders',
      type: 'repeat',
      templateOptions: {
        addText: T.GCF.CALENDARS.CAL_PROVIDERS_ADD,
      },
      fieldArray: {
        fieldGroup: [
          {
            hide: true,
            type: 'input',
            key: 'id',
            hooks: {
              onInit: (field) => {
                if (!field?.formControl?.value) {
                  field?.formControl?.setValue(nanoid());
                }
              },
            },
          },
          {
            type: 'toggle',
            key: 'isEnabled',
            hooks: {
              onInit: (field) => {
                if (!field?.formControl?.value) {
                  field?.formControl?.setValue(true);
                }
              },
            },
            templateOptions: {
              label: T.G.ENABLED,
            },
          },
          {
            type: 'input',
            key: 'icalUrl',
            templateOptions: {
              required: true,
              type: 'url',
              label: T.GCF.CALENDARS.CAL_PATH,
            },
          },
          {
            type: 'icon',
            key: 'icon',
            hooks: {
              onInit: (field) => {
                if (!field?.formControl?.value) {
                  field?.formControl?.setValue('event');
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
                if (!field?.formControl?.value) {
                  field?.formControl?.setValue(60 * 60000);
                }
              },
            },
            templateOptions: {
              required: false,
              label: T.GCF.CALENDARS.CHECK_UPDATES,
              description: T.G.DURATION_DESCRIPTION,
            },
          },
          {
            type: 'duration',
            key: 'showBannerBeforeThreshold',
            hooks: {
              onInit: (field) => {
                if (!field?.formControl?.value) {
                  field?.formControl?.setValue(60 * 60000);
                }
              },
            },
            templateOptions: {
              isAllowSeconds: true,
              label: T.GCF.CALENDARS.SHOW_BANNER_THRESHOLD,
              description: T.G.DURATION_DESCRIPTION,
            },
          },
          {
            type: 'project-select',
            key: 'defaultProjectId',
            templateOptions: {
              label: T.GCF.CALENDARS.DEFAULT_PROJECT,
            },
          },
        ],
      },
    },
  ],
};
