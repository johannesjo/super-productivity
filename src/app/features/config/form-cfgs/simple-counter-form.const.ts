// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {SimpleCounterConfig, SimpleCounterType} from '../../simple-counter/simple-counter.model';
import {T} from '../../../t.const';

export const SIMPLE_COUNTER_FORM: ConfigFormSection<SimpleCounterConfig> = {
  title: T.F.SIMPLE_COUNTER.FORM.TITLE,
  key: 'EMPTY',
  customSection: 'SIMPLE_COUNTER_CFG',
  help: T.F.SIMPLE_COUNTER.FORM.HELP,
  items: [
    {
      key: 'counters',
      type: 'repeat',
      templateOptions: {
        addText: T.F.SIMPLE_COUNTER.FORM.ADD_NEW,
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
            key: 'title',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_TITLE,
            },
          },
          {
            key: 'type',
            type: 'select',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_TYPE,
              required: true,
              options: [
                {label: T.F.SIMPLE_COUNTER.FORM.TYPE_STOPWATCH, value: SimpleCounterType.StopWatch},
                {label: T.F.SIMPLE_COUNTER.FORM.TYPE_CLICK_COUNTER, value: SimpleCounterType.ClickCounter},
              ],
            },
          },
          {
            type: 'icon',
            key: 'icon',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_ICON,
            },
          },
          {
            type: 'icon',
            key: 'iconOn',
            templateOptions: {
              label: T.F.SIMPLE_COUNTER.FORM.L_ICON_ON,
              hideExpression: ((model: any) => {
                return model.type !== SimpleCounterType.StopWatch;
              })
            },
          },
        ],
      },
    },
  ]
};
