"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GithubIssueActionTypes;
(function (GithubIssueActionTypes) {
    GithubIssueActionTypes["LoadState"] = "[GithubIssue] Load GithubIssue State";
    GithubIssueActionTypes["AddOpenGithubIssuesToBacklog"] = "[GithubIssue] Add open issues to backlog";
    // GithubIssue Actions
    GithubIssueActionTypes["LoadGithubIssues"] = "[GithubIssue] Load GithubIssues";
    GithubIssueActionTypes["UpsertGithubIssue"] = "[GithubIssue] Upsert GithubIssue";
    GithubIssueActionTypes["AddGithubIssue"] = "[GithubIssue] Add GithubIssue";
    GithubIssueActionTypes["AddGithubIssues"] = "[GithubIssue] Add GithubIssues";
    GithubIssueActionTypes["UpdateGithubIssue"] = "[GithubIssue] Update GithubIssue";
    GithubIssueActionTypes["UpdateGithubIssues"] = "[GithubIssue] Update GithubIssues";
    GithubIssueActionTypes["DeleteGithubIssue"] = "[GithubIssue] Delete GithubIssue";
    GithubIssueActionTypes["DeleteGithubIssues"] = "[GithubIssue] Delete GithubIssues";
    GithubIssueActionTypes["ClearGithubIssues"] = "[GithubIssue] Clear GithubIssues";
})(GithubIssueActionTypes = exports.GithubIssueActionTypes || (exports.GithubIssueActionTypes = {}));
var LoadState = /** @class */ (function () {
    function LoadState(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.LoadState;
    }
    return LoadState;
}());
exports.LoadState = LoadState;
var AddOpenGithubIssuesToBacklog = /** @class */ (function () {
    function AddOpenGithubIssuesToBacklog() {
        this.type = GithubIssueActionTypes.AddOpenGithubIssuesToBacklog;
    }
    return AddOpenGithubIssuesToBacklog;
}());
exports.AddOpenGithubIssuesToBacklog = AddOpenGithubIssuesToBacklog;
var LoadGithubIssues = /** @class */ (function () {
    function LoadGithubIssues(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.LoadGithubIssues;
    }
    return LoadGithubIssues;
}());
exports.LoadGithubIssues = LoadGithubIssues;
var AddGithubIssue = /** @class */ (function () {
    function AddGithubIssue(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.AddGithubIssue;
    }
    return AddGithubIssue;
}());
exports.AddGithubIssue = AddGithubIssue;
var UpsertGithubIssue = /** @class */ (function () {
    function UpsertGithubIssue(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.UpsertGithubIssue;
    }
    return UpsertGithubIssue;
}());
exports.UpsertGithubIssue = UpsertGithubIssue;
var AddGithubIssues = /** @class */ (function () {
    function AddGithubIssues(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.AddGithubIssues;
    }
    return AddGithubIssues;
}());
exports.AddGithubIssues = AddGithubIssues;
var UpdateGithubIssue = /** @class */ (function () {
    function UpdateGithubIssue(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.UpdateGithubIssue;
    }
    return UpdateGithubIssue;
}());
exports.UpdateGithubIssue = UpdateGithubIssue;
var UpdateGithubIssues = /** @class */ (function () {
    function UpdateGithubIssues(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.UpdateGithubIssues;
    }
    return UpdateGithubIssues;
}());
exports.UpdateGithubIssues = UpdateGithubIssues;
var DeleteGithubIssue = /** @class */ (function () {
    function DeleteGithubIssue(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.DeleteGithubIssue;
    }
    return DeleteGithubIssue;
}());
exports.DeleteGithubIssue = DeleteGithubIssue;
var DeleteGithubIssues = /** @class */ (function () {
    function DeleteGithubIssues(payload) {
        this.payload = payload;
        this.type = GithubIssueActionTypes.DeleteGithubIssues;
    }
    return DeleteGithubIssues;
}());
exports.DeleteGithubIssues = DeleteGithubIssues;
var ClearGithubIssues = /** @class */ (function () {
    function ClearGithubIssues() {
        this.type = GithubIssueActionTypes.ClearGithubIssues;
    }
    return ClearGithubIssues;
}());
exports.ClearGithubIssues = ClearGithubIssues;
//# sourceMappingURL=github-issue.actions.js.map