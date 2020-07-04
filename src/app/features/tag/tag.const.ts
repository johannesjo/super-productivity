import { Tag } from './tag.model';
import {
  DEFAULT_TAG_COLOR,
  DEFAULT_TODAY_TAG_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME
} from '../work-context/work-context.const';

export const TODAY_TAG: Tag = {
  id: 'TODAY',
  icon: 'wb_sunny',
  title: 'Today',
  color: null,
  created: Date.now(),
  modified: Date.now(),
  taskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TODAY_TAG_COLOR,
  }
};

export const DEFAULT_TAG: Tag = {
  id: '',
  icon: null,
  title: '',
  color: null,
  created: Date.now(),
  modified: Date.now(),
  taskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TAG_COLOR,
  }
};
