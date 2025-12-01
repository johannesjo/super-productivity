import { ConfigFormSection } from '../../../config/global-config.model';
import { T } from '../../../../t.const';
import { IssueProviderCalendar } from '../../issue.model';
import { CalendarProviderCfg } from './calendar.model';
import { ISSUE_PROVIDER_FF_DEFAULT_PROJECT } from '../../common-issue-form-stuff.const';
import { IS_ELECTRON } from '../../../../app.constants';
import { IssueLog } from '../../../../core/log';

export const DEFAULT_CALENDAR_CFG: CalendarProviderCfg = {
  isEnabled: false,
  icalUrl: '',
  isAutoImportForCurrentDay: false,
  checkUpdatesEvery: 2 * 60 * 60000,
  showBannerBeforeThreshold: 2 * 60 * 60000,
  isDisabledForWebApp: false,
};

export const CALENDAR_FORM_CFG_NEW: ConfigFormSection<IssueProviderCalendar> = {
  title: 'CALENDAR',
  help: T.GCF.CALENDARS.HELP,
  key: 'ICAL',
  items: [
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
      type: 'input',
      key: 'icalUrl',
      templateOptions: {
        required: true,
        type: 'url',
        label: T.GCF.CALENDARS.CAL_PATH,
      },
    },
    ISSUE_PROVIDER_FF_DEFAULT_PROJECT,
    {
      type: 'duration',
      key: 'checkUpdatesEvery',
      hooks: {
        onInit: (field) => {
          IssueLog.log(field?.formControl?.value);
          if (!field?.formControl?.value) {
            field?.formControl?.setValue(2 * 60 * 60000);
          }
        },
      },
      templateOptions: {
        label: T.GCF.CALENDARS.CHECK_UPDATES,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      type: 'duration',
      key: 'showBannerBeforeThreshold',
      hooks: {
        onInit: (field) => {
          IssueLog.log(field?.formControl?.value);
          if (!field?.formControl?.value && field?.formControl?.value !== null) {
            field?.formControl?.setValue(2 * 60 * 60000);
          }
        },
      },
      templateOptions: {
        required: false,
        isAllowSeconds: true,
        label: T.GCF.CALENDARS.SHOW_BANNER_THRESHOLD,
        description: T.G.DURATION_DESCRIPTION,
      },
    },
    {
      type: 'checkbox',
      key: 'isAutoImportForCurrentDay',
      templateOptions: {
        type: 'url',
        // TODO translation
        // label: T.GCF.CALENDARS.CAL_PATH,
        label: 'Auto import events as tasks for current day',
      },
    },
    {
      type: 'checkbox',
      key: 'isDisabledForWebApp',
      templateOptions: {
        type: 'url',
        // TODO translation
        // label: T.GCF.CALENDARS.CAL_PATH,
        label: 'Disable when using web application',
      },
    },
    // {
    //   type: 'icon',
    //   key: 'icon',
    //   hooks: {
    //     onInit: (field) => {
    //       if (!field?.formControl?.value) {
    //         field?.formControl?.setValue('event');
    //       }
    //     },
    //   },
    //   templateOptions: {
    //     label: T.GCF.CALENDARS.ICON,
    //   },
    // },
  ],
};
