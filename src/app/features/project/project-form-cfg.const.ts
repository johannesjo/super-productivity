import {ConfigFormSection, GenericConfigFormSection} from '../config/global-config.model';
import {T} from '../../t.const';
import {ProjectThemeCfg} from './project.model';


export const PROJECT_THEME_CONFIG_FORM_CONFIG: ConfigFormSection<ProjectThemeCfg> = {
  title: T.F.PROJECT.FORM_THEME.TITLE,
  key: 'basic',
  help: T.F.PROJECT.FORM_THEME.HELP,
  items: [
    {
      key: 'primary',
      type: 'input',
      templateOptions: {
        label: T.F.PROJECT.FORM_THEME.L_COLOR_PRIMARY,
        type: 'color',
      },
    },
    {
      key: 'accent',
      type: 'input',
      templateOptions: {
        label: T.F.PROJECT.FORM_THEME.L_COLOR_ACCENT,
        type: 'color',
      },
    },
    {
      key: 'warn',
      type: 'input',
      templateOptions: {
        label: T.F.PROJECT.FORM_THEME.L_COLOR_WARN,
        type: 'color',
      },
    },
    {
      key: 'isDarkTheme',
      type: 'checkbox',
      templateOptions: {
        label: T.F.PROJECT.FORM_THEME.L_IS_DARK_THEME,
        description: T.F.PROJECT.FORM_THEME.D_IS_DARK_THEME,
      },
    },
    {
      key: 'isReducedTheme',
      type: 'checkbox',
      templateOptions: {
        label: T.F.PROJECT.FORM_THEME.L_IS_REDUCED_THEME,
      },
    },
  ]
};

export const BASIC_PROJECT_CONFIG_FORM_CONFIG: ConfigFormSection<GenericConfigFormSection> = {
  title: 'Project Settings & Theme',
  key: 'basic',
  /* tslint:disable */
  help: `Very basic settings for your project.`,
  /* tslint:enable */
  items: [
    {
      key: 'title',
      type: 'input',
      templateOptions: {
        required: true,
        label: 'Title',
      },
    },
  ]
};
