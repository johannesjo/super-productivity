import {ConfigFormConfig, ConfigFormSection} from '../config/global-config.model';
import {ALL_THEMES} from '../../app.constants';

const themeOpts = ALL_THEMES.map((theme) => {
  return {label: theme, value: theme};
});


export const BASIC_PROJECT_CONFIG_FORM_CONFIG: ConfigFormSection = {
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
    {
      key: 'themeColor',
      type: 'select',
      templateOptions: {
        required: true,
        label: 'Theme Color',
        options: themeOpts,
        valueProp: 'value',
        labelProp: 'label',
        placeholder: 'Theme Color'
      },
    },
    {
      key: 'isDarkTheme',
      type: 'checkbox',
      templateOptions: {
        label: 'Use Dark Theme',
        description: 'Won`t be used if system supports global dark mode.'
      },
    },
    {
      key: 'isReducedTheme',
      type: 'checkbox',
      templateOptions: {
        label: 'Use reduced UI (no boxes around tasks)',
      },
    },
  ]
};

export const PROJECT_CONFIG_FORM_CONFIG: ConfigFormConfig = [];

