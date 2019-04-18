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
var _a;
var entity_1 = require("@ngrx/entity");
var attachment_actions_1 = require("./attachment.actions");
var store_1 = require("@ngrx/store");
var task_actions_1 = require("../../tasks/store/task.actions");
exports.ATTACHMENT_FEATURE_NAME = 'attachment';
exports.adapter = entity_1.createEntityAdapter();
exports.selectAttachmentFeatureState = store_1.createFeatureSelector(exports.ATTACHMENT_FEATURE_NAME);
exports.selectIds = (_a = exports.adapter.getSelectors(), _a.selectIds), exports.selectEntities = _a.selectEntities, exports.selectAll = _a.selectAll, exports.selectTotal = _a.selectTotal;
exports.selectAllAttachments = store_1.createSelector(exports.selectAttachmentFeatureState, exports.selectAll);
exports.selectAttachmentByIds = store_1.createSelector(exports.selectAttachmentFeatureState, function (state, props) { return props.ids ? props.ids.map(function (id) { return state.entities[id]; }) : []; });
exports.initialAttachmentState = exports.adapter.getInitialState({
    stateBeforeDeletingTask: null
});
function attachmentReducer(state, action) {
    if (state === void 0) { state = exports.initialAttachmentState; }
    switch (action.type) {
        case task_actions_1.TaskActionTypes.DeleteTask: {
            var task = action.payload.task;
            var taskIds_1 = [task.id].concat(task.subTaskIds);
            var attachmentIds = state.ids;
            var idsToRemove = attachmentIds.filter(function (id) { return taskIds_1.includes(state.entities[id].taskId); });
            return __assign({}, exports.adapter.removeMany(idsToRemove, state), { stateBeforeDeletingTask: __assign({}, state, { stateBeforeDeletingTask: null }) });
        }
        case task_actions_1.TaskActionTypes.UndoDeleteTask: {
            return state.stateBeforeDeletingTask || state;
        }
        case attachment_actions_1.AttachmentActionTypes.AddAttachment: {
            return exports.adapter.addOne(action.payload.attachment, state);
        }
        case attachment_actions_1.AttachmentActionTypes.UpdateAttachment: {
            return exports.adapter.updateOne(action.payload.attachment, state);
        }
        case attachment_actions_1.AttachmentActionTypes.DeleteAttachment: {
            return exports.adapter.removeOne(action.payload.id, state);
        }
        case attachment_actions_1.AttachmentActionTypes.DeleteAttachments: {
            return exports.adapter.removeMany(action.payload.ids, state);
        }
        case attachment_actions_1.AttachmentActionTypes.LoadAttachmentState:
            return __assign({}, action.payload.state);
        default: {
            return state;
        }
    }
}
exports.attachmentReducer = attachmentReducer;
//# sourceMappingURL=attachment.reducer.js.map