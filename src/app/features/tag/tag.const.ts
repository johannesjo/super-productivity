import {Tag} from './tag.model';
import {WORK_CONTEXT_DEFAULT_COMMON} from '../work-context/work-context.const';

export const TODAY_TAG: Tag = {
  id: 'TODAY',
  icon: 'wb_sunny',
  title: 'Today',
  color: null,
  created: Date.now(),
  modified: Date.now(),
  taskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
};
