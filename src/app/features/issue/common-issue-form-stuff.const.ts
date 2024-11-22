import { T } from '../../t.const';
import { LimitedFormlyFieldConfig } from '../config/global-config.model';
import { IssueProvider } from './issue.model';

// NOTE: FILE IS REQUIRED TO AVOID CIRCULAR DEPENDENCY ISSUES

// const ISSUE_PROVIDER_FF_LINE: LimitedFormlyFieldConfig<IssueProvider> = {
//   type: 'tpl',
//   className: `tpl line`,
//   props: {
//     tag: 'hr',
//   },
// };

// export const ISSUE_PROVIDER_FF_CREDENTIALS: LimitedFormlyFieldConfig<IssueProvider> = {
//   type: 'tpl',
//   className: 'tpl',
//   props: {
//     tag: 'h3',
//     class: 'sub-section-heading-first',
//     // TODO add translation
//     // text: T.F.JIRA.FORM_SECTION.CREDENTIALS,
//     text: 'Credentials',
//   },
// };

const ISSUE_PROVIDER_FF_ADVANCED_SETTINGS_HEADER: LimitedFormlyFieldConfig<IssueProvider> =
  {
    type: 'tpl',
    className: 'tpl',
    props: {
      tag: 'h3',
      class: 'sub-section-heading',
      text: T.F.JIRA.FORM_SECTION.ADV_CFG,
    },
  };

const ISSUE_PROVIDER_FF_DEFAULT_PROJECT: LimitedFormlyFieldConfig<IssueProvider> = {
  key: 'defaultProjectId',
  type: 'project-select',
  defaultValue: false,
  props: {
    label: T.F.ISSUE.DEFAULT_PROJECT_LABEL,
    description: T.F.ISSUE.DEFAULT_PROJECT_DESCRIPTION,
  },
} as const;

export const ISSUE_PROVIDER_COMMON_FORM_FIELDS: LimitedFormlyFieldConfig<IssueProvider>[] =
  [
    ISSUE_PROVIDER_FF_ADVANCED_SETTINGS_HEADER,
    ISSUE_PROVIDER_FF_DEFAULT_PROJECT,
    // {
    //   key: 'isIntegratedAddTaskBar',
    //   type: 'checkbox',
    //   props: {
    //     label: T.F.CALDAV.FORM.IS_SEARCH_ISSUES_FROM_CALDAV,
    //   },
    // },
    {
      hideExpression: (model: any) => !model.defaultProjectId,
      key: 'isAutoAddToBacklog',
      type: 'checkbox',
      props: {
        // label: T.F.CALDAV.FORM.IS_AUTO_IMPORT_ISSUES,
        label: 'Auto import to default project',
      },
    },
    {
      key: 'isAutoPoll',
      type: 'checkbox',
      props: {
        // label: T.F.CALDAV.FORM.IS_AUTO_POLL,
        label: 'Poll imported for changes and notify',
      },
    },
    // ISSUE_PROVIDER_FF_LINE,
  ] as const;
