import {Tag} from './tag.model';
import {WORK_CONTEXT_DEFAULT_COMMON} from '../work-context/work-context.const';

export const MY_DAY_TAG: Tag = {
  id: 'MY_DAY',
  icon: 'wb_sunny',
  name: 'My Day',
  color: 'red',
  created: Date.now(),
  modified: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
};
