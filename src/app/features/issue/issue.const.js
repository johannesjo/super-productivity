"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a, _b;
var jira_const_1 = require("./jira/jira.const");
var github_const_1 = require("./github/github.const");
exports.GITHUB_TYPE = 'GIT';
exports.JIRA_TYPE = 'JIRA';
exports.issueProviderKeys = [exports.JIRA_TYPE, exports.GITHUB_TYPE];
exports.issueProviderIconMap = (_a = {},
    _a[exports.JIRA_TYPE] = 'jira',
    _a[exports.GITHUB_TYPE] = 'github',
    _a);
exports.DEFAULT_ISSUE_PROVIDER_CFGS = (_b = {},
    _b[exports.JIRA_TYPE] = jira_const_1.DEFAULT_JIRA_CFG,
    _b[exports.GITHUB_TYPE] = github_const_1.DEFAULT_GITHUB_CFG,
    _b);
exports.ISSUE_PROVIDER_FORM_CFGS = [
    // GITHUB
    {
        title: 'Github',
        key: exports.GITHUB_TYPE,
        items: github_const_1.GITHUB_CONFIG_FORM,
        /* tslint:disable */
        help: "<p>Here you can configure SuperProductivity to list open GithHub issues for a specific repository in the task creation panel in the daily planning view. They will be listed as suggestions and will provide a link to the issue as well as more information about it.</p>\n  <p>In addition you can automatically add and sync all open issues to your task backlog.</p>",
    },
    // JIRA
    {
        title: 'Jira',
        key: exports.JIRA_TYPE,
        customSection: 'JIRA_CFG',
        /* tslint:disable */
        help: "<div class=\"mat-caption\">Basic configuration</div>\n  <p>Please provide a login name (can be found on your profile page) and an\n    <a href=\"https://confluence.atlassian.com/cloud/api-tokens-938839638.html\"\n       target=\"_blank\">API token</a> or password if you can't generate one for some reason.\n  </p>\n  <p>You also need to specify a JQL query which is used for the suggestions to add tasks from Jira. If you need help check out this link\n    <a href=\"https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html\"\n       target=\"_blank\">https://confluence.atlassian.com/jirasoftwarecloud/advanced-searching-764478330.html</a>.</p>\n  <p>You can also configure, if you want to automatically (e.g. every time you visit the planning view), to add all new tasks specified by a custom JQL query to the backlog.</p>\n  <p>Another option is \"Check if current ticket is assigned to current user\". If enabled and you're starting, a check will be made if you're currently assigned to that ticket on Jira, if not an Dialog appears in which you can chose to assign the ticket to yourself.</p>\n\n\n  <div class=\"mat-caption\">Worklog settings</div>\n  <p>There are several options to determine when and how you want to submit a worklog. Enabling\n    <em>'Open worklog dialog for adding a worklog to Jira when task is done'</em> opens a dialog to add an worklog every time you mark a Jira Task as done. So keep in mind that worklogs will be added on top of everything tracked so far. So if you mark a task as done for a second time, you might not want to submit the complete worked time for the task again.\n  </p>\n  <p>\n    <em>'Open worklog dialog when sub task is done and not for tasks with sub tasks themselves'</em> opens a worklog dialog every time when you mark a sub task of a Jira issue as done. Because you already track your time via the sub tasks, no dialog is opened once you mark the Jira task itself as done.\n  </p>\n  <p>\n    <em>'Send updates to worklog automatically without dialog'</em> does what it says. Because marking a task as done several times leads to the whole worked time being tracked twice, this is not recommended.\n  </p>\n\n  <div class=\"mat-caption\">Default transitions</div>\n  <p>Here you can reconfigure your default transitions. Jira enables a wide configuration of transitions usually coming into action as different columns on your Jira agile board we can't make assumptions about where and when to transition your tasks and you need to set it manually.</p>",
        /* tslint:enable */
        items: [
            {
                className: 'tpl',
                template: ' <h3 class="sub-section-heading">Credentials</h3>',
            }
        ].concat(jira_const_1.JIRA_CREDENTIALS_FORM_CFG, [
            {
                className: 'tpl',
                template: ' <h3 class="sub-section-heading">Advanced Config</h3>',
            }
        ], jira_const_1.JIRA_ADVANCED_FORM_CFG)
    },
];
//# sourceMappingURL=issue.const.js.map