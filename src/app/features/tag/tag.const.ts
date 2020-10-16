import { Tag } from './tag.model';
import {
  DEFAULT_TAG_COLOR,
  DEFAULT_TODAY_TAG_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME
} from '../work-context/work-context.const';
import { IS_MAC } from '../../util/is-mac';

const IS_USE_DARK: boolean = !IS_MAC || !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;

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

    ...(IS_USE_DARK
      ? {
        isDisableBackgroundGradient: true,
        backgroundImage: 'assets/bg/NIGHT_manuel-will.jpg'
      }
      : {}),
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
