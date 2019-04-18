"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIDE_SUB_TASKS = 0;
exports.HIDE_DONE_SUB_TASKS = 1;
exports.SHOW_SUB_TASKS = 2;
exports.DEFAULT_TASK = {
    id: null,
    subTaskIds: [],
    attachmentIds: [],
    timeSpentOnDay: {},
    timeSpent: 0,
    timeEstimate: 0,
    isDone: false,
    title: '',
    notes: '',
    parentId: null,
    issueId: null,
    issueType: null,
    reminderId: null,
    created: Date.now(),
    _isAdditionalInfoOpen: false,
    _showSubTasksMode: exports.SHOW_SUB_TASKS,
    _currentTab: 0,
};
//# sourceMappingURL=task.model.js.map