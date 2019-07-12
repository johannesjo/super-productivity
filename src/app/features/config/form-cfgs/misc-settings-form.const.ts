// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';

export const MISC_SETTINGS_FORM_CFG: ConfigFormSection = {
  title: 'Misc Settings',
  key: 'misc',
  help: 'fMisc.help',
  items: [
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: 'fMisc.isConfirmBeforeExit',
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: 'fMisc.isNotifyWhenTimeEstimateExceeded',
      },
    },
    {
      key: 'isHideNav',
      type: 'checkbox',
      templateOptions: {
        label: 'fMisc.isHideNav',
      },
    },
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: 'fMisc.isAutMarkParentAsDone',
      },
    },
    {
      key: 'isDisableRemindWhenForgotToFinishDay',
      type: 'checkbox',
      templateOptions: {
        label: 'fMisc.isDisableRemindWhenForgotToFinishDay',
      },
    },
  ]
};
