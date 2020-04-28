// tslint:disable:max-line-length
import {ConfigFormSection} from '../global-config.model';
import {SimpleCounterConfig} from '../../simple-counter/simple-counter.model';

export const SIMPLE_COUNTER_FORM: ConfigFormSection<SimpleCounterConfig> = {
  // title: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  title: 'Simple Counter',
  key: 'simpleCounter',
  customSection: 'SIMPLE_COUNTER_CFG',
  // help: T.GCF.GOOGLE_DRIVE_SYNC.TITLE,
  items: []
};
