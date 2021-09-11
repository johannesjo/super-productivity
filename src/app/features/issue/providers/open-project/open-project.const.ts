// TODO use as a checklist
import { OpenProjectCfg } from './open-project.model';
import { T } from '../../../../t.const';
import {
  ConfigFormSection,
  LimitedFormlyFieldConfig,
} from '../../../config/global-config.model';

export const DEFAULT_OPEN_PROJECT_CFG: OpenProjectCfg = {
  host: null,
  projectId: null,
  token: null,
  isSearchIssuesFromOpenProject: false,
  isAutoPoll: false,
  isAutoAddToBacklog: false,
  filterUsername: null,
};

export const OPEN_PROJECT_POLL_INTERVAL = 5 * 60 * 1000;
export const OPEN_PROJECT_INITIAL_POLL_DELAY = 8 * 1000;

export const OPEN_PROJECT_CONFIG_FORM: LimitedFormlyFieldConfig<OpenProjectCfg>[] = [
  {
    key: 'host',
    type: 'input',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.HOST,
      type: 'text',
      pattern: /^.+\/.+?$/i,
      required: true,
    },
  },
  {
    key: 'token',
    type: 'input',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.TOKEN,
      required: true,
    },
  },
  {
    key: 'projectId',
    type: 'input',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.PROJECT_ID,
      type: 'text',
      required: true,
      description: T.F.OPEN_PROJECT.FORM.PROJECT_ID_DESCRIPTION,
    },
  },
  {
    key: 'isSearchIssuesFromOpenProject',
    type: 'checkbox',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.IS_SEARCH_ISSUES_FROM_OPEN_PROJECT,
    },
  },
  {
    key: 'isAutoPoll',
    type: 'checkbox',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.IS_AUTO_POLL,
    },
  },
  {
    key: 'isAutoAddToBacklog',
    type: 'checkbox',
    templateOptions: {
      label: T.F.OPEN_PROJECT.FORM.IS_AUTO_ADD_TO_BACKLOG,
    },
  },
  // TODO also remove translation and model if removing it for good
  // {
  //   key: 'filterUsername',
  //   type: 'input',
  //   templateOptions: {
  //     label: T.F.OPEN_PROJECT.FORM.FILTER_USER,
  //   },
  // },
];

export const OPEN_PROJECT_CONFIG_FORM_SECTION: ConfigFormSection<OpenProjectCfg> = {
  title: 'Open Project',
  key: 'OPEN_PROJECT',
  items: OPEN_PROJECT_CONFIG_FORM,
  help: T.F.OPEN_PROJECT.FORM_SECTION.HELP,
};
