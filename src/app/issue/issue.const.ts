import { ConfigFormConfig } from '../core/config/config.model';
import { JIRA_ADVANCED_FORM_CFG, JIRA_CREDENTIALS_FORM_CFG } from './jira/jira.const';
import { IssueProviderKey } from './issue';
import { GIT_CONFIG_FORM } from './git/git.const';

export const issueProviderKeys: IssueProviderKey[] = ['JIRA', 'GIT'];

export const issueProviderIconMap = {
  'JIRA': 'jira',
  'GIT': 'github'
};


export const ISSUE_PROVIDER_FORM_CFGS: ConfigFormConfig = [
  // GIT
  {
    title: 'GitHub',
    key: 'GIT',
    items: GIT_CONFIG_FORM
  },

  // JIRA
  {
    title: 'Jira',
    key: 'JIRA',
    items: [
      {
        className: 'tpl isHideWhenJiraSupport',
        template: `<p>Please <a href="https://chrome.google.com/webstore/detail/super-productivity/ljkbjodfmekklcoibdnhahlaalhihmlb">
download the chrome extension</a> in order to allow communication with the Jira Api. Note that this doesn\'t work for mobile.</p>`,
      },
      {
        className: 'tpl',
        template: ' <h3 class="sub-section-heading">Credentials</h3>',
      },
      ...JIRA_CREDENTIALS_FORM_CFG,
      {
        className: 'tpl',
        template: ' <h3 class="sub-section-heading">Advanced Config</h3>',
      },
      ...JIRA_ADVANCED_FORM_CFG,
    ]
  },
];
