// tslint:disable:max-line-length
import {ConfigFormSection, MiscConfig} from '../global-config.model';
import {T} from '../../../t.const';


export const MISC_SETTINGS_FORM_CFG: ConfigFormSection<MiscConfig> = {
  title: T.GCF.MISC.TITLE,
  key: 'misc',
  help: T.GCF.MISC.HELP,
  items: [
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_CONFIRM_BEFORE_EXIT,
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_NOTIFY_WHEN_TIME_ESTIMATE_EXCEEDED,
      },
    },
    {
      key: 'isHideNav',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_HIDE_NAV,
      },
    },
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_AUTO_MARK_PARENT_AS_DONE,
      },
    },
    {
      key: 'isDisableRemindWhenForgotToFinishDay',
      type: 'checkbox',
      templateOptions: {
        label: T.GCF.MISC.IS_DISABLE_REMIND_WHEN_FORGOT_TO_FINISH_DAY,
      },
    },
  ]
};
