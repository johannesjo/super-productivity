import {ConfigFormConfig, ConfigFormSection} from '../config/global-config.model';
import {ALL_THEMES} from '../../app.constants';
import {T} from '../../t.const';

const themeOpts = ALL_THEMES.map((theme) => {
  return {label: theme, value: theme};
});


export const BASIC_PROJECT_CONFIG_FORM_CONFIG: ConfigFormSection = {
  title: T.F.PROJECT.FORM.TITLE,
  key: 'basic',
  help: T.F.PROJECT.FORM.HELP,
  items: [
    {
      key: 'title',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.F.PROJECT.FORM.L_TITLE,
      },
    },
    {
      key: 'themeColor',
      type: 'select',
      templateOptions: {
        required: true,
        label: T.F.PROJECT.FORM.L_THEME_COLOR,
        options: themeOpts,
        valueProp: 'value',
        labelProp: 'label',
        placeholder: T.F.PROJECT.FORM.L_THEME_COLOR,
      },
    },
    {
      key: 'isDarkTheme',
      type: 'checkbox',
      templateOptions: {
        label: T.F.PROJECT.FORM.L_IS_DARK_THEME,
        description: T.F.PROJECT.FORM.D_IS_DARK_THEME,
      },
    },
    {
      key: 'isReducedTheme',
      type: 'checkbox',
      templateOptions: {
        label: T.F.PROJECT.FORM.L_IS_REDUCED_THEME,
      },
    },
  ]
};

export const PROJECT_CONFIG_FORM_CONFIG: ConfigFormConfig = [];

