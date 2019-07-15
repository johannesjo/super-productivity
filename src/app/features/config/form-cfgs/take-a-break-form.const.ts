// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {T} from '../../../t.const';

export const TAKE_A_BREAK_FORM_CFG: ConfigFormSection = {
  title: T.F_TAKE_A_BREAK.TITLE,
  key: 'takeABreak',
  help: T.F_TAKE_A_BREAK.HELP,
  items: [
    {
      key: 'isTakeABreakEnabled',
      type: 'checkbox',
      templateOptions: {
        label: T.F_TAKE_A_BREAK.IS_ENABLED
      },
    },
    {
      key: 'takeABreakMinWorkingTime',
      type: 'duration',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: T.F_TAKE_A_BREAK.MIN_WORKING_TIME
      },
    }, {
      key: 'takeABreakMessage',
      type: 'textarea',
      hideExpression: '!model.isTakeABreakEnabled',
      templateOptions: {
        label: T.F_TAKE_A_BREAK.MESSAGE
      },
    },
  ]
};
