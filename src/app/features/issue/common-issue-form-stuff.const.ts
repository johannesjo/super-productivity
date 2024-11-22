import { T } from '../../t.const';
import { LimitedFormlyFieldConfig } from '../config/global-config.model';
import { IssueProvider } from './issue.model';

// NOTE: FILE IS REQUIRED TO AVOID CIRCULAR DEPENDENCY ISSUES

export const ISSUE_PROVIDER_FF_LINE: LimitedFormlyFieldConfig<IssueProvider> = {
  type: 'tpl',
  className: `tpl line`,
  props: {
    tag: 'hr',
  },
};

export const ISSUE_PROVIDER_FF_CREDENTIALS: LimitedFormlyFieldConfig<IssueProvider> = {
  type: 'tpl',
  className: 'tpl',
  props: {
    tag: 'h3',
    class: 'sub-section-heading-first',
    // TODO add translation
    // text: T.F.JIRA.FORM_SECTION.CREDENTIALS,
    text: 'Credentials',
  },
};

export const ISSUE_PROVIDER_FF_ADVANCED_SETTINGS_HEADER: LimitedFormlyFieldConfig<IssueProvider> =
  {
    type: 'tpl',
    className: 'tpl',
    props: {
      tag: 'h3',
      class: 'sub-section-heading',
      text: T.F.JIRA.FORM_SECTION.ADV_CFG,
    },
  };

export const ISSUE_PROVIDER_FF_DEFAULT_PROJECT: LimitedFormlyFieldConfig<IssueProvider> =
  {
    key: 'defaultProjectId',
    type: 'project-select',
    defaultValue: false,
    props: {
      label: T.F.ISSUE.DEFAULT_PROJECT_LABEL,
      description: T.F.ISSUE.DEFAULT_PROJECT_DESCRIPTION,
    },
  } as const;
