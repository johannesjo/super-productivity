"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var github_const_1 = require("../github/github.const");
exports.JIRA_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';
exports.DEFAULT_JIRA_CFG = {
    isEnabled: false,
    _isBlockAccess: false,
    host: null,
    userName: null,
    password: null,
    isAutoPollTickets: true,
    searchJqlQuery: '',
    isAutoAddToBacklog: true,
    autoAddBacklogJqlQuery: 'assignee = currentUser() AND sprint in openSprints() AND resolution = Unresolved',
    isWorklogEnabled: true,
    isAutoWorklog: false,
    isAddWorklogOnSubTaskDone: true,
    isUpdateIssueFromLocal: false,
    isShowComponents: true,
    isCheckToReAssignTicketOnTaskStart: true,
    userAssigneeName: null,
    isTransitionIssuesEnabled: true,
    availableTransitions: [],
    transitionConfig: {
        // OPEN: 'DO_NOT',
        IN_PROGRESS: 'ALWAYS_ASK',
        DONE: 'ALWAYS_ASK'
    },
    userToAssignOnDone: null
};
// export const JIRA_POLL_INTERVAL = 10 * 1000;
// export const JIRA_INITIAL_POLL_DELAY = 5000;
exports.JIRA_POLL_INTERVAL = 5 * 60 * 1000;
exports.JIRA_INITIAL_POLL_DELAY = github_const_1.GITHUB_INITIAL_POLL_DELAY + 5000;
exports.JIRA_INITIAL_POLL_BACKLOG_DELAY = exports.JIRA_INITIAL_POLL_DELAY + 10 * 1000;
// it's weird!!
exports.JIRA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSZZ';
exports.JIRA_ISSUE_TYPE = 'JIRA';
exports.JIRA_REQUEST_TIMEOUT_DURATION = 12000;
exports.JIRA_MAX_RESULTS = 100;
exports.JIRA_ADDITIONAL_ISSUE_FIELDS = [
    'assignee',
    'summary',
    'description',
    'timeestimate',
    'timespent',
    'status',
    'attachment',
    'comment',
    'updated',
    'components',
    'subtasks',
];
// there has to be one field otherwise we get all...
exports.JIRA_REDUCED_ISSUE_FIELDS = [
    'summary',
    'updated',
    'timeestimate',
    'timespent',
];
exports.JIRA_CREDENTIALS_FORM_CFG = [
    {
        key: 'host',
        type: 'input',
        templateOptions: {
            required: true,
            label: 'Host',
        },
    },
    {
        key: 'userName',
        type: 'input',
        templateOptions: {
            required: true,
            label: 'Email / Username',
        },
    },
    {
        key: 'password',
        type: 'input',
        templateOptions: {
            required: true,
            label: 'Token / Password',
            type: 'password',
            description: 'See https://confluence.atlassian.com/cloud/api-tokens-938839638.html'
        },
    },
];
exports.JIRA_ADVANCED_FORM_CFG = [
    {
        key: 'isAutoPollTickets',
        type: 'checkbox',
        templateOptions: {
            label: 'Check imported issues for changes automatically and notify',
        },
    },
    {
        key: 'isCheckToReAssignTicketOnTaskStart',
        type: 'checkbox',
        templateOptions: {
            label: 'Check if the currently worked on issue is assigned to current user',
        },
    },
    {
        key: 'userAssigneeName',
        type: 'input',
        templateOptions: {
            label: 'Assignee name to check for',
            required: true,
        },
        hideExpression: '!model.isCheckToReAssignTicketOnTaskStart',
    },
    {
        key: 'isAutoAddToBacklog',
        type: 'checkbox',
        templateOptions: {
            label: 'Automatically add issues to Jira backlog',
        },
    },
    {
        key: 'autoAddBacklogJqlQuery',
        type: 'input',
        templateOptions: {
            label: 'JQL used for adding tasks automatically to backlog',
        },
    },
    {
        key: 'searchJqlQuery',
        type: 'input',
        templateOptions: {
            label: 'JQL Query for to limit the searcher tasks',
        },
    },
    {
        key: 'isWorklogEnabled',
        type: 'checkbox',
        templateOptions: {
            label: 'Open dialog to submit worklog to jira when task is done',
        },
    },
    {
        key: 'isAddWorklogOnSubTaskDone',
        type: 'checkbox',
        templateOptions: {
            label: 'Open dialog to submit worklog to jira when sub task is done',
        },
    },
];
//# sourceMappingURL=jira.const.js.map