"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var JiraIssueActionTypes;
(function (JiraIssueActionTypes) {
    JiraIssueActionTypes["LoadState"] = "[JiraIssue] Load JiraIssue State";
    JiraIssueActionTypes["AddOpenJiraIssuesToBacklog"] = "[JiraIssue] Add open issues to backlog";
    // JiraIssue Actions
    JiraIssueActionTypes["LoadJiraIssues"] = "[JiraIssue] Load JiraIssues";
    JiraIssueActionTypes["UpsertJiraIssue"] = "[JiraIssue] Upsert JiraIssue";
    JiraIssueActionTypes["AddJiraIssue"] = "[JiraIssue] Add JiraIssue";
    JiraIssueActionTypes["AddJiraIssues"] = "[JiraIssue] Add JiraIssues";
    JiraIssueActionTypes["UpdateJiraIssue"] = "[JiraIssue] Update JiraIssue";
    JiraIssueActionTypes["UpdateJiraIssues"] = "[JiraIssue] Update JiraIssues";
    JiraIssueActionTypes["DeleteJiraIssue"] = "[JiraIssue] Delete JiraIssue";
    JiraIssueActionTypes["DeleteJiraIssues"] = "[JiraIssue] Delete JiraIssues";
    JiraIssueActionTypes["ClearJiraIssues"] = "[JiraIssue] Clear JiraIssues";
})(JiraIssueActionTypes = exports.JiraIssueActionTypes || (exports.JiraIssueActionTypes = {}));
var LoadState = /** @class */ (function () {
    function LoadState(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.LoadState;
    }
    return LoadState;
}());
exports.LoadState = LoadState;
var AddOpenJiraIssuesToBacklog = /** @class */ (function () {
    function AddOpenJiraIssuesToBacklog() {
        this.type = JiraIssueActionTypes.AddOpenJiraIssuesToBacklog;
    }
    return AddOpenJiraIssuesToBacklog;
}());
exports.AddOpenJiraIssuesToBacklog = AddOpenJiraIssuesToBacklog;
var LoadJiraIssues = /** @class */ (function () {
    function LoadJiraIssues(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.LoadJiraIssues;
    }
    return LoadJiraIssues;
}());
exports.LoadJiraIssues = LoadJiraIssues;
var AddJiraIssue = /** @class */ (function () {
    function AddJiraIssue(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.AddJiraIssue;
    }
    return AddJiraIssue;
}());
exports.AddJiraIssue = AddJiraIssue;
var UpsertJiraIssue = /** @class */ (function () {
    function UpsertJiraIssue(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.UpsertJiraIssue;
    }
    return UpsertJiraIssue;
}());
exports.UpsertJiraIssue = UpsertJiraIssue;
var AddJiraIssues = /** @class */ (function () {
    function AddJiraIssues(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.AddJiraIssues;
    }
    return AddJiraIssues;
}());
exports.AddJiraIssues = AddJiraIssues;
var UpdateJiraIssue = /** @class */ (function () {
    function UpdateJiraIssue(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.UpdateJiraIssue;
    }
    return UpdateJiraIssue;
}());
exports.UpdateJiraIssue = UpdateJiraIssue;
var UpdateJiraIssues = /** @class */ (function () {
    function UpdateJiraIssues(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.UpdateJiraIssues;
    }
    return UpdateJiraIssues;
}());
exports.UpdateJiraIssues = UpdateJiraIssues;
var DeleteJiraIssue = /** @class */ (function () {
    function DeleteJiraIssue(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.DeleteJiraIssue;
    }
    return DeleteJiraIssue;
}());
exports.DeleteJiraIssue = DeleteJiraIssue;
var DeleteJiraIssues = /** @class */ (function () {
    function DeleteJiraIssues(payload) {
        this.payload = payload;
        this.type = JiraIssueActionTypes.DeleteJiraIssues;
    }
    return DeleteJiraIssues;
}());
exports.DeleteJiraIssues = DeleteJiraIssues;
var ClearJiraIssues = /** @class */ (function () {
    function ClearJiraIssues() {
        this.type = JiraIssueActionTypes.ClearJiraIssues;
    }
    return ClearJiraIssues;
}());
exports.ClearJiraIssues = ClearJiraIssues;
//# sourceMappingURL=jira-issue.actions.js.map