// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {T} from '../../../t.const';


export const MISC_SETTINGS_FORM_CFG: ConfigFormSection = {
  title: 'Misc Settings',
  key: 'misc',
  help: T.F_MISC.HELP,
  items: [
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: T.F_MISC.IS_CONFIRM_BEFORE_EXIT,
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: T.F_MISC.IS_NOTIFY_WHEN_TIME_ESTIMATE_EXCEEDED,
      },
    },
    {
      key: 'isHideNav',
      type: 'checkbox',
      templateOptions: {
        label: T.F_MISC.IS_HIDE_NAV,
      },
    },
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: T.F_MISC.IS_AUTO_MARK_PARENT_AS_DONE,
      },
    },
    {
      key: 'isDisableRemindWhenForgotToFinishDay',
      type: 'checkbox',
      templateOptions: {
        label: T.F_MISC.IS_DISABLE_REMIND_WHEN_FORGOT_TO_FINISH_DAY,
      },
    },
  ]
};
