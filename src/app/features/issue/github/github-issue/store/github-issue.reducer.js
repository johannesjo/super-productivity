"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var entity_1 = require("@ngrx/entity");
var github_issue_actions_1 = require("./github-issue.actions");
var store_1 = require("@ngrx/store");
var task_actions_1 = require("../../../../tasks/store/task.actions");
var issue_const_1 = require("../../../issue.const");
exports.GITHUB_ISSUE_FEATURE_NAME = issue_const_1.GITHUB_TYPE;
exports.githubIssueAdapter = entity_1.createEntityAdapter();
// SELECTORS
// ---------
exports.selectGithubIssueFeatureState = store_1.createFeatureSelector(exports.GITHUB_ISSUE_FEATURE_NAME);
var _a = exports.githubIssueAdapter.getSelectors(), selectIds = _a.selectIds, selectEntities = _a.selectEntities, selectAll = _a.selectAll, selectTotal = _a.selectTotal;
exports.selectGithubIssueIds = store_1.createSelector(exports.selectGithubIssueFeatureState, selectIds);
exports.selectGithubIssueEntities = store_1.createSelector(exports.selectGithubIssueFeatureState, selectEntities);
exports.selectAllGithubIssues = store_1.createSelector(exports.selectGithubIssueFeatureState, selectAll);
// select the total user count
exports.selectGithubIssueTotal = store_1.createSelector(exports.selectGithubIssueFeatureState, selectTotal);
// DYNAMIC SELECTORS
// -----------------
exports.selectGithubIssueById = store_1.createSelector(exports.selectGithubIssueFeatureState, function (state, props) { return state.entities[props.id]; });
// REDUCER
// -------
exports.initialGithubIssueState = exports.githubIssueAdapter.getInitialState({
    stateBefore: null
});
function githubIssueReducer(state, action) {
    if (state === void 0) { state = exports.initialGithubIssueState; }
    switch (action.type) {
        // Meta Actions
        // ------------
        case github_issue_actions_1.GithubIssueActionTypes.LoadState: {
            return Object.assign({}, action.payload.state);
        }
        case task_actions_1.TaskActionTypes.UndoDeleteTask: {
            return state.stateBefore || state;
        }
        case task_actions_1.TaskActionTypes.AddTask: {
            if (action.payload.issue && action.payload.task.issueType === issue_const_1.GITHUB_TYPE) {
                var issue = action.payload.issue;
                return exports.githubIssueAdapter.upsertOne(issue, state);
            }
            return state;
        }
        case task_actions_1.TaskActionTypes.DeleteTask: {
            if (action.payload.task.issueType === issue_const_1.GITHUB_TYPE) {
                var issue = action.payload.task.issueData;
                var ids = state.ids;
                if (issue && issue.id && ids.includes(+issue.id)) {
                    return exports.githubIssueAdapter.removeOne(issue.id, __assign({}, state, { stateBefore: __assign({}, state, { stateBefore: null }) }));
                }
                else {
                    // don't crash app but warn strongly
                    console.log('##########################################################');
                    console.warn(' THIS SHOULD NOT HAPPEN: Github IssueData could not be found', issue, action, state);
                    console.log('##########################################################');
                    return state;
                }
                // TODO sub task case if we need it in the future
            }
            return state;
        }
        case task_actions_1.TaskActionTypes.MoveToArchive: {
            var tasksWithGithubIssue = action.payload.tasks.filter(function (task) { return task.issueType === issue_const_1.GITHUB_TYPE; });
            if (tasksWithGithubIssue && tasksWithGithubIssue.length > 0) {
                var issueIds = tasksWithGithubIssue.map(function (task) { return task.issueId; })
                    // only remove if data is there in the first place
                    .filter(function (issueId) {
                    var ids = state.ids;
                    var isInState = ids.includes(+issueId);
                    if (!isInState) {
                        // don't crash app but warn strongly
                        console.log('##########################################################');
                        console.warn(' THIS SHOULD NOT HAPPEN: Github Issue could not be found', issueId, action, state);
                        console.log('##########################################################');
                    }
                    return isInState;
                });
                return issueIds.length
                    ? exports.githubIssueAdapter.removeMany(issueIds, state)
                    : state;
            }
            return state;
        }
        case task_actions_1.TaskActionTypes.RestoreTask: {
            if (action.payload.task.issueType === issue_const_1.GITHUB_TYPE) {
                var issue = action.payload.task.issueData;
                return exports.githubIssueAdapter.upsertOne(issue, state);
                // TODO sub task case if we need it in the future
            }
            return state;
        }
        // GithubIssue Actions
        // ------------
        case github_issue_actions_1.GithubIssueActionTypes.UpsertGithubIssue: {
            return exports.githubIssueAdapter.upsertOne(action.payload.githubIssue, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.AddGithubIssue: {
            return exports.githubIssueAdapter.addOne(action.payload.githubIssue, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.AddGithubIssues: {
            return exports.githubIssueAdapter.addMany(action.payload.githubIssues, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.UpdateGithubIssue: {
            return exports.githubIssueAdapter.updateOne(action.payload.githubIssue, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.UpdateGithubIssues: {
            return exports.githubIssueAdapter.updateMany(action.payload.githubIssues, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.DeleteGithubIssue: {
            return exports.githubIssueAdapter.removeOne(action.payload.id, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.DeleteGithubIssues: {
            return exports.githubIssueAdapter.removeMany(action.payload.ids, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.LoadGithubIssues: {
            return exports.githubIssueAdapter.addAll(action.payload.githubIssues, state);
        }
        case github_issue_actions_1.GithubIssueActionTypes.ClearGithubIssues: {
            return exports.githubIssueAdapter.removeAll(state);
        }
        default: {
            return state;
        }
    }
}
exports.githubIssueReducer = githubIssueReducer;
//# sourceMappingURL=github-issue.reducer.js.map