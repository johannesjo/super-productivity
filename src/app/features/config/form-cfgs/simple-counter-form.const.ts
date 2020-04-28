// tslint:disable:max-line-length
import {T} from '../../../t.const';
import {ConfigFormSection} from '../global-config.model';
import {SimpleCounterConfig} from '../../simple-counter/simple-counter.model';

export const SIMPLE_COUNTER_FORM: ConfigFormSection<SimpleCounterConfig> = {
  title: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  key: 'simpleCounter',
  help: T.GCF.GOOGLE_DRIVE_SYNC.HELP,
  items: [
    {
      key: 'counters',
      type: 'repeat',
      templateOptions: {
        addText: 'Add another investment',
      },
      fieldArray: {
        fieldGroup: [
          {
            className: 'col-sm-4',
            type: 'input',
            key: 'investmentName',
            templateOptions: {
              label: 'Name of Investment:',
              required: true,
            },
          },
          {
            type: 'input',
            key: 'investmentDate',
            className: 'col-sm-4',
            templateOptions: {
              type: 'date',
              label: 'Date of Investment:',
            },
          },
          {
            type: 'input',
            key: 'stockIdentifier',
            className: 'col-sm-4',
            templateOptions: {
              label: 'Stock Identifier:',
              addonRight: {
                class: 'fa fa-code',
                onClick: (to, fieldType, $event) => console.log(to, fieldType, $event),
              },
            },
          },
        ],
      },
    },
  ]
};
