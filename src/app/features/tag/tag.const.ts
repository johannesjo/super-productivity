import { Tag } from './tag.model';
import {
  DEFAULT_TAG_COLOR,
  DEFAULT_TODAY_TAG_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME,
} from '../work-context/work-context.const';
import { WorkContextThemeCfg } from '../work-context/work-context.model';

export const TODAY_TAG: Tag = {
  id: 'TODAY',
  icon: 'wb_sunny',
  title: 'Today',
  color: null,
  created: Date.now(),
  taskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TODAY_TAG_COLOR,
    backgroundImageDark: 'assets/bg/NIGHT_manuel-will.jpg',

    ...((window.matchMedia('(prefers-color-scheme: dark)').matches
      ? {
          isDisableBackgroundGradient: false,
        }
      : {}) as Partial<WorkContextThemeCfg>),
  },
};

export const DEFAULT_TAG: Tag = {
  id: '',
  icon: null,
  title: '',
  color: null,
  created: Date.now(),
  taskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TAG_COLOR,
  },
};

export const NO_LIST_TAG: Tag = {
  id: 'NO_LIST',
  icon: 'question_mark',
  title: 'no list scheduled',
  color: null,
  created: Date.now(),
  taskIds: [],
  ...WORK_CONTEXT_DEFAULT_COMMON,
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TODAY_TAG_COLOR,
    backgroundImageDark: 'assets/bg/NIGHT_manuel-will.jpg',

    ...((window.matchMedia('(prefers-color-scheme: dark)').matches
      ? {
          isDisableBackgroundGradient: false,
        }
      : {}) as Partial<WorkContextThemeCfg>),
  },
};
