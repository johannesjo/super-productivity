import { Tag } from './tag.model';
import {
  DEFAULT_TAG_COLOR,
  DEFAULT_TODAY_TAG_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME,
} from '../work-context/work-context.const';
import { WorkContextThemeCfg } from '../work-context/work-context.model';

export const TODAY_TAG: Tag = {
  icon: 'wb_sunny',
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  title: 'Today',
  id: 'TODAY',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TODAY_TAG_COLOR,
    // backgroundImageDark: 'assets/bg/NIGHT_manuel-will.jpg',
    backgroundImageDark: '',

    ...((window.matchMedia('(prefers-color-scheme: dark)').matches
      ? {
          isDisableBackgroundGradient: false,
        }
      : {}) as Partial<WorkContextThemeCfg>),
  },
};

export const DEFAULT_TAG: Tag = {
  icon: null,
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  title: '',
  id: '',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TAG_COLOR,
  },
};

export const NO_LIST_TAG: Tag = {
  icon: 'question_mark',
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  title: 'no list scheduled',
  id: 'NO_LIST',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TODAY_TAG_COLOR,
    backgroundImageDark: '',

    ...((window.matchMedia('(prefers-color-scheme: dark)').matches
      ? {
          isDisableBackgroundGradient: false,
        }
      : {}) as Partial<WorkContextThemeCfg>),
  },
};
