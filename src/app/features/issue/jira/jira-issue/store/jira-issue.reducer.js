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
var jira_issue_actions_1 = require("./jira-issue.actions");
var store_1 = require("@ngrx/store");
var task_actions_1 = require("../../../../tasks/store/task.actions");
var issue_const_1 = require("../../../issue.const");
exports.JIRA_ISSUE_FEATURE_NAME = issue_const_1.JIRA_TYPE;
exports.jiraIssueAdapter = entity_1.createEntityAdapter();
// SELECTORS
// ---------
exports.selectJiraIssueFeatureState = store_1.createFeatureSelector(exports.JIRA_ISSUE_FEATURE_NAME);
var _a = exports.jiraIssueAdapter.getSelectors(), selectIds = _a.selectIds, selectEntities = _a.selectEntities, selectAll = _a.selectAll, selectTotal = _a.selectTotal;
exports.selectJiraIssueIds = store_1.createSelector(exports.selectJiraIssueFeatureState, selectIds);
exports.selectJiraIssueEntities = store_1.createSelector(exports.selectJiraIssueFeatureState, selectEntities);
exports.selectAllJiraIssues = store_1.createSelector(exports.selectJiraIssueFeatureState, selectAll);
// select the total user count
exports.selectJiraIssueTotal = store_1.createSelector(exports.selectJiraIssueFeatureState, selectTotal);
// DYNAMIC SELECTORS
// -----------------
exports.selectJiraIssueById = store_1.createSelector(exports.selectJiraIssueFeatureState, function (state, props) { return state.entities[props.id]; });
// REDUCER
// -------
exports.initialJiraIssueState = exports.jiraIssueAdapter.getInitialState({
    stateBefore: null
});
function jiraIssueReducer(state, action) {
    if (state === void 0) { state = exports.initialJiraIssueState; }
    switch (action.type) {
        // Meta Actions
        // ------------
        case jira_issue_actions_1.JiraIssueActionTypes.LoadState: {
            return Object.assign({}, action.payload.state);
        }
        case task_actions_1.TaskActionTypes.UndoDeleteTask: {
            return state.stateBefore || state;
        }
        case task_actions_1.TaskActionTypes.AddTask: {
            if (action.payload.issue && action.payload.task.issueType === issue_const_1.JIRA_TYPE) {
                var issue = action.payload.issue;
                return exports.jiraIssueAdapter.upsertOne(issue, state);
            }
            return state;
        }
        case task_actions_1.TaskActionTypes.DeleteTask: {
            if (action.payload.task.issueType === issue_const_1.JIRA_TYPE) {
                var issue = action.payload.task.issueData;
                var ids = state.ids;
                if (issue && issue.id && ids.includes(issue.id)) {
                    return exports.jiraIssueAdapter.removeOne(issue.id, __assign({}, state, { stateBefore: __assign({}, state, { stateBefore: null }) }));
                }
                else {
                    // don't crash app but warn strongly
                    console.log('##########################################################');
                    console.warn(' THIS SHOULD NOT HAPPEN: Jira Issue Data could not be found', issue, action, state);
                    console.log('##########################################################');
                    return state;
                }
                // TODO sub task case if we need it in the future
            }
            return state;
        }
        case task_actions_1.TaskActionTypes.MoveToArchive: {
            var tasksWithJiraIssue = action.payload.tasks.filter(function (task) { return task.issueType === issue_const_1.JIRA_TYPE; });
            if (tasksWithJiraIssue && tasksWithJiraIssue.length > 0) {
                var issueIds = tasksWithJiraIssue.map(function (task) { return task.issueId; })
                    .filter(function (issueId) {
                    var ids = state.ids;
                    var isInState = ids.includes(issueId);
                    if (!isInState) {
                        // don't crash app but warn strongly
                        console.log('##########################################################');
                        console.warn(' THIS SHOULD NOT HAPPEN: Jira Issue could not be found', issueId, action, state);
                        console.log('##########################################################');
                    }
                    return isInState;
                });
                return issueIds.length
                    ? exports.jiraIssueAdapter.removeMany(issueIds, state)
                    : state;
            }
            return state;
        }
        case task_actions_1.TaskActionTypes.RestoreTask: {
            if (action.payload.task.issueType === issue_const_1.JIRA_TYPE) {
                var issue = action.payload.task.issueData;
                return exports.jiraIssueAdapter.upsertOne(issue, state);
                // TODO sub task case if we need it in the future
            }
            return state;
        }
        // JiraIssue Actions
        // ------------
        case jira_issue_actions_1.JiraIssueActionTypes.UpsertJiraIssue: {
            return exports.jiraIssueAdapter.upsertOne(action.payload.jiraIssue, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.AddJiraIssue: {
            return exports.jiraIssueAdapter.addOne(action.payload.jiraIssue, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.AddJiraIssues: {
            return exports.jiraIssueAdapter.addMany(action.payload.jiraIssues, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.UpdateJiraIssue: {
            return exports.jiraIssueAdapter.updateOne(action.payload.jiraIssue, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.UpdateJiraIssues: {
            return exports.jiraIssueAdapter.updateMany(action.payload.jiraIssues, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.DeleteJiraIssue: {
            return exports.jiraIssueAdapter.removeOne(action.payload.id, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.DeleteJiraIssues: {
            return exports.jiraIssueAdapter.removeMany(action.payload.ids, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.LoadJiraIssues: {
            return exports.jiraIssueAdapter.addAll(action.payload.jiraIssues, state);
        }
        case jira_issue_actions_1.JiraIssueActionTypes.ClearJiraIssues: {
            return exports.jiraIssueAdapter.removeAll(state);
        }
        default: {
            return state;
        }
    }
}
exports.jiraIssueReducer = jiraIssueReducer;
//# sourceMappingURL=jira-issue.reducer.js.map