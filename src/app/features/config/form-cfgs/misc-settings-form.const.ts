// tslint:disable:max-line-length
import { ConfigFormSection } from '../global-config.model';

export const MISC_SETTINGS_FORM_CFG: ConfigFormSection = {
  title: 'Misc Settings',
  key: 'misc',
  help: `
  <div>
      <p>Hopefully self explanatory.</p>
  </div>`,
  items: [
    {
      key: 'isConfirmBeforeExit',
      type: 'checkbox',
      templateOptions: {
        label: 'Confirm before exiting the app',
      },
    },
    {
      key: 'isNotifyWhenTimeEstimateExceeded',
      type: 'checkbox',
      templateOptions: {
        label: 'Notify when time estimate was exceeded',
      },
    },
    {
      key: 'isHideNav',
      type: 'checkbox',
      templateOptions: {
        label: 'Hide navigation until main header is hovered (desktop only)',
      },
    },
    {
      key: 'isAutMarkParentAsDone',
      type: 'checkbox',
      templateOptions: {
        label: 'Mark parent task as done, when all sub tasks are done',
      },
    },
    {
      key: 'isDisableRemindWhenForgotToFinishDay',
      type: 'checkbox',
      templateOptions: {
        label: 'Disable reminder about forgotten finish day',
      },
    },
  ]
};
