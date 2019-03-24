import { ConfigFormConfig } from '../config/config.model';
import { DEFAULT_JIRA_CFG, JIRA_ADVANCED_FORM_CFG, JIRA_CREDENTIALS_FORM_CFG } from './jira/jira.const';
import { IssueProviderKey } from './issue';
import { DEFAULT_GITHUB_CFG, GITHUB_CONFIG_FORM } from './github/github.const';

export const GITHUB_TYPE: IssueProviderKey = 'GIT';
export const JIRA_TYPE: IssueProviderKey = 'JIRA';

export const issueProviderKeys: IssueProviderKey[] = [JIRA_TYPE, GITHUB_TYPE];

export const issueProviderIconMap = {
  [JIRA_TYPE]: 'jira',
  [GITHUB_TYPE]: 'github'
};

export const DEFAULT_ISSUE_PROVIDER_CFGS = {
  [JIRA_TYPE]: DEFAULT_JIRA_CFG,
  [GITHUB_TYPE]: DEFAULT_GITHUB_CFG,
};

export const ISSUE_PROVIDER_FORM_CFGS: ConfigFormConfig = [
  // GITHUB
  {
    title: 'Github',
    key: GITHUB_TYPE,
    items: GITHUB_CONFIG_FORM,
    /* tslint:disable */
    help: `<p>Here you can configure SuperProductivity to list open GithHub issues for a specific repository in the task creation panel in the daily planning view. They will be listed as suggestions and will provide a link to the issue as well as more information about it.</p>
  <p>In addition you can automatically add and sync all open issues to your task backlog.</p>`,
    /* tslint:enable */
  },

  // JIRA
  {
    title: 'Jira',
    key: JIRA_TYPE,
    customSection: 'JIRA_CFG',
    /* tslint:disable */
    help: `<div class="mat-caption">Basic configuration</div>
  <p>Please provide a login name (can be found on your profile page) and an
    <a href="https://confluence.atlassian.com/cloud/api-tokens-938839638.html"
       target="_blank">API token</a> or password if you can't generate one for some reason.
  </p>
  <p>You also need to specify a JQL query which is used for the suggestions to add tasks from Jira. If you need help check out this link
    <a href="https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html"
       target="_blank">https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html</a>.</p>
  <p>You can also configure, if you want to automatically (e.g. every time you visit the planning view), to add all new tasks specified by a custom JQL query to the backlog.</p>
  <p>Another option is "Check if current ticket is assigned to current user". If enabled and you're starting, a check will be made if you're currently assigned to that ticket on Jira, if not an Dialog appears in which you can chose to assign the ticket to yourself.</p>


  <div class="mat-caption">Worklog settings</div>
  <p>There are several options to determine when and how you want to submit a worklog. Enabling
    <em>'Open worklog dialog for adding a worklog to Jira when task is done'</em> opens a dialog to add an worklog every time you mark a Jira Task as done. So keep in mind that worklogs will be added on top of everything tracked so far. So if you mark a task as done for a second time, you might not want to submit the complete worked time for the task again.
  </p>
  <p>
    <em>'Open worklog dialog when sub task is done and not for tasks with sub tasks themselves'</em> opens a worklog dialog every time when you mark a sub task of a Jira issue as done. Because you already track your time via the sub tasks, no dialog is opened once you mark the Jira task itself as done.
  </p>
  <p>
    <em>'Send updates to worklog automatically without dialog'</em> does what it says. Because marking a task as done several times leads to the whole worked time being tracked twice, this is not recommended.
  </p>

  <div class="mat-caption">Default transitions</div>
  <p>Here you can reconfigure your default transitions. Jira enables a wide configuration of transitions usually coming into action as different columns on your Jira agile board we can't make assumptions about where and when to transition your tasks and you need to set it manually.</p>`,
    /* tslint:enable */
    items: [
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
