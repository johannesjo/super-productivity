// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {SimpleCounterConfig, SimpleCounterType} from '../../simple-counter/simple-counter.model';
import {T} from '../../../t.const';

export const SIMPLE_COUNTER_FORM: ConfigFormSection<SimpleCounterConfig> = {
  // title: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  title: 'Simple Counters',
  key: 'EMPTY',
  customSection: 'SIMPLE_COUNTER_CFG',
  // help: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  items: [
    {
      key: 'counters',
      type: 'repeat',
      templateOptions: {
        addText: 'Add another counter button',
      },
      fieldArray: {
        fieldGroup: [
          {
            type: 'checkbox',
            key: 'isEnabled',
            templateOptions: {
              label: 'Enabled',
            },
          },
          {
            type: 'input',
            key: 'title',
            templateOptions: {
              label: 'Title',
              required: true,
            },
          },
          {
            key: 'type',
            type: 'select',
            templateOptions: {
              label: T.GCF.LANG.LABEL,
              required: true,
              options: [
                {label: T.GCF.LANG.AR, value: SimpleCounterType.StopWatch},
                {label: T.GCF.LANG.PT, value: SimpleCounterType.ClickCounter},
              ],
            },
          },
          {
            type: 'icon',
            key: 'icon',
            templateOptions: {
              label: 'Icon',
            },
          },
          {
            type: 'icon',
            key: 'iconOn',
            templateOptions: {
              label: 'Icon On',
              hideExpression: 'model.type !== "StopWatch"',
            },
          },
        ],
      },
    },
  ]
};
