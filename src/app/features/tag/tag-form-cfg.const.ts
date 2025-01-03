import {
  ConfigFormSection,
  GenericConfigFormSection,
} from '../config/global-config.model';
import { T } from '../../t.const';
import { Tag } from './tag.model';

export const BASIC_TAG_CONFIG_FORM_CONFIG: ConfigFormSection<Tag> = {
  title: T.F.TAG.FORM_BASIC.TITLE,
  key: 'basic',
  items: [
    {
      key: 'title',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.F.TAG.FORM_BASIC.L_TITLE,
      },
    },
    {
      key: 'icon',
      type: 'icon',
      templateOptions: {
        label: T.F.TAG.FORM_BASIC.L_ICON,
        description: T.G.ICON_INP_DESCRIPTION,
      },
    },
    {
      key: 'color',
      type: 'input',
      templateOptions: {
        label: T.F.TAG.FORM_BASIC.L_COLOR,
        type: 'color',
      },
    },
  ],
};

export const CREATE_TAG_BASIC_CONFIG_FORM_CONFIG: GenericConfigFormSection = {
  title: 'Tag Settings & Theme',
  key: 'basic',
  /* eslint-disable */
  help: `Very basic settings for your project.`,
  /* eslint-enable */
  items: [
    {
      key: 'title',
      type: 'input',
      templateOptions: {
        required: true,
        label: T.F.TAG.FORM_BASIC.L_TITLE,
      },
    },
    {
      key: 'theme.primary',
      type: 'input',
      templateOptions: {
        label: T.F.PROJECT.FORM_THEME.L_THEME_COLOR,
        type: 'color',
      },
    },
  ],
};
