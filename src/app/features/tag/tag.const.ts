import { Tag } from './tag.model';
import {
  DEFAULT_TAG_COLOR,
  DEFAULT_TODAY_TAG_COLOR,
  WORK_CONTEXT_DEFAULT_COMMON,
  WORK_CONTEXT_DEFAULT_THEME,
} from '../work-context/work-context.const';
import { WorkContextThemeCfg } from '../work-context/work-context.model';

export const TODAY_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'wb_sunny',
  title: 'Today',
  id: 'TODAY',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TODAY_TAG_COLOR,
    // backgroundImageDark: 'assets/bg/NIGHT_manuel-will.jpg',
    backgroundImageDark: '',
    isDisableBackgroundGradient: false,
  },
};

export const DEFAULT_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: null,
  title: '',
  id: '',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: DEFAULT_TAG_COLOR,
  },
};

export const NO_LIST_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'question_mark',
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

// TODO translate
export const URGENT_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'emergency',
  title: 'urgent',
  id: 'EM_URGENT',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#c618e1',
    backgroundImageDark: '',
    isDisableBackgroundGradient: false,
  },
};

export const IMPORTANT_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  icon: 'priority_high',
  title: 'important',
  id: 'EM_IMPORTANT',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    primary: '#e11826',
    backgroundImageDark: '',
    isDisableBackgroundGradient: false,
  },
};

export const IN_PROGRESS_TAG: Tag = {
  color: null,
  created: Date.now(),
  ...WORK_CONTEXT_DEFAULT_COMMON,
  title: 'in-progress',
  id: 'KANBAN_IN_PROGRESS',
  theme: {
    ...WORK_CONTEXT_DEFAULT_THEME,
    backgroundImageDark: '',
    isDisableBackgroundGradient: false,
  },
};
