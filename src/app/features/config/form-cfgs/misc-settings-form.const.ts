// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {_} from '@biesbjerg/ngx-translate-extract/dist/utils/utils';
import {T} from '../../../t.const';


export const MISC_SETTINGS_FORM_CFG: ConfigFormSection = {
  title: 'Misc Settings',
  key: 'misc',
  help: _(T.fMisc.help) as string,
  items: [
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: _(T.fMisc.isConfirmBeforeExit) as string,
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: _(T.fMisc.isNotifyWhenTimeEstimateExceeded) as string,
      },
    },
    {
      key: 'isHideNav',
      type: 'checkbox',
      templateOptions: {
        label: _(T.fMisc.isHideNav) as string,
      },
    },
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: _(T.fMisc.isAutMarkParentAsDone) as string,
      },
    },
    {
      key: 'isDisableRemindWhenForgotToFinishDay',
      type: 'checkbox',
      templateOptions: {
        label: _(T.fMisc.isDisableRemindWhenForgotToFinishDay) as string,
      },
    },
  ]
};
