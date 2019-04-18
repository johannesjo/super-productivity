"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GITHUB_CFG = {
    repo: null,
    isSearchIssuesFromGithub: false,
    isAutoPoll: false,
    isAutoAddToBacklog: false,
};
// NOTE: we need a high limit because git has low usage limits :(
exports.GITHUB_MAX_CACHE_AGE = 10 * 60 * 1000;
exports.GITHUB_POLL_INTERVAL = exports.GITHUB_MAX_CACHE_AGE;
exports.GITHUB_INITIAL_POLL_DELAY = 8 * 1000;
// export const GITHUB_POLL_INTERVAL = 15 * 1000;
exports.GITHUB_API_BASE_URL = 'https://api.github.com/';
exports.GITHUB_CONFIG_FORM = [
    {
        key: 'repo',
        type: 'input',
        templateOptions: {
            label: '"username/repositoryName" for the git repository you want to track',
        },
    },
    {
        key: 'isSearchIssuesFromGithub',
        type: 'checkbox',
        templateOptions: {
            label: 'Show issues from git as suggestions when adding new tasks',
        },
    },
    {
        key: 'isAutoPoll',
        type: 'checkbox',
        templateOptions: {
            label: 'Automatically poll imported git issues for changes',
        },
    },
    {
        key: 'isAutoAddToBacklog',
        type: 'checkbox',
        templateOptions: {
            label: 'Automatically add unresolved issues from Github to backlog',
        },
    },
];
//# sourceMappingURL=github.const.js.map