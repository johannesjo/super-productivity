import { ConfigFormConfig, ConfigFormSection } from '../config/config.model';

const ALL_THEMES = [
  'blue',
  'indigo',
  'purple',
  'deep-purple',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'indigo',
  'lime',
  'yellow',
  'amber',
  'deep-orange',
  'grey',
  'blue-grey',
  'indigo',
  'indigo',
];
const themeOpts = ALL_THEMES.map((theme) => {
  return {label: theme, value: theme};
});


export const BASIC_PROJECT_CONFIG_FORM_CONFIG: ConfigFormSection = {
  title: 'Basic Settings',
  key: 'basic',
  /* tslint:disable */
  help: `Yadda yada yada`,
  /* tslint:enable */
  items:[
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
      },
    },
  ]
};

export const PROJECT_CONFIG_FORM_CONFIG: ConfigFormConfig = [
];

