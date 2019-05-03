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
var task_actions_1 = require("./task.actions");
var task_model_1 = require("../task.model");
var calc_total_time_spent_1 = require("../util/calc-total-time-spent");
var array_move_1 = require("../../../util/array-move");
var attachment_actions_1 = require("../../attachment/store/attachment.actions");
exports.TASK_FEATURE_NAME = 'tasks';
exports.taskAdapter = entity_1.createEntityAdapter();
// REDUCER
// -------
exports.initialTaskState = exports.taskAdapter.getInitialState({
    currentTaskId: null,
    lastCurrentTaskId: null,
    todaysTaskIds: [],
    backlogTaskIds: [],
    focusTaskId: null,
    lastActiveFocusTaskId: null,
    stateBefore: null,
    isDataLoaded: false,
});
// HELPER
// ------
var getTaskById = function (taskId, state) {
    if (!state.entities[taskId]) {
        throw new Error('Task not found');
    }
    else {
        return state.entities[taskId];
    }
};
var filterOutId = function (idToFilterOut) { return function (id) { return id !== idToFilterOut; }; };
var mapTaskWithSubTasksToTask = function (task) {
    var copy = __assign({}, task_model_1.DEFAULT_TASK, task);
    delete copy.subTasks;
    delete copy.issueData;
    return copy;
};
exports.filterStartableTasks = function (s) {
    var ids = s.ids;
    return ids.filter(function (id) {
        var t = s.entities[id];
        return !t.isDone && ((t.parentId)
            ? (s.todaysTaskIds.includes(t.parentId))
            : (s.todaysTaskIds.includes(id) && (!t.subTaskIds || t.subTaskIds.length === 0)));
    });
};
// SHARED REDUCER ACTIONS
// ----------------------
var reCalcTimesForParentIfParent = function (parentId, state) {
    var stateWithTimeEstimate = reCalcTimeEstimateForParentIfParent(parentId, state);
    return reCalcTimeSpentForParentIfParent(parentId, stateWithTimeEstimate);
};
var reCalcTimeSpentForParentIfParent = function (parentId, state) {
    if (parentId) {
        var parentTask = getTaskById(parentId, state);
        var subTasks = parentTask.subTaskIds.map(function (id) { return state.entities[id]; });
        var timeSpentOnDayParent_1 = {};
        subTasks.forEach(function (subTask) {
            Object.keys(subTask.timeSpentOnDay).forEach(function (strDate) {
                if (subTask.timeSpentOnDay[strDate]) {
                    if (!timeSpentOnDayParent_1[strDate]) {
                        timeSpentOnDayParent_1[strDate] = 0;
                    }
                    timeSpentOnDayParent_1[strDate] += subTask.timeSpentOnDay[strDate];
                }
            });
        });
        return exports.taskAdapter.updateOne({
            id: parentId,
            changes: {
                timeSpentOnDay: timeSpentOnDayParent_1,
                timeSpent: calc_total_time_spent_1.calcTotalTimeSpent(timeSpentOnDayParent_1),
            }
        }, state);
    }
    else {
        return state;
    }
};
var reCalcTimeEstimateForParentIfParent = function (parentId, state) {
    if (parentId) {
        var parentTask = state.entities[parentId];
        var subTasks = parentTask.subTaskIds.map(function (id) { return state.entities[id]; });
        return exports.taskAdapter.updateOne({
            id: parentId,
            changes: {
                timeEstimate: subTasks.reduce(function (acc, task) { return acc + task.timeEstimate; }, 0),
            }
        }, state);
    }
    else {
        return state;
    }
};
var updateTimeSpentForTask = function (id, newTimeSpentOnDay, state) {
    if (!newTimeSpentOnDay) {
        return state;
    }
    var task = getTaskById(id, state);
    var timeSpent = calc_total_time_spent_1.calcTotalTimeSpent(newTimeSpentOnDay);
    var stateAfterUpdate = exports.taskAdapter.updateOne({
        id: id,
        changes: {
            timeSpentOnDay: newTimeSpentOnDay,
            timeSpent: timeSpent,
        }
    }, state);
    return task.parentId
        ? reCalcTimeSpentForParentIfParent(task.parentId, stateAfterUpdate)
        : stateAfterUpdate;
};
var updateTimeEstimateForTask = function (taskId, newEstimate, state) {
    if (newEstimate === void 0) { newEstimate = null; }
    if (!newEstimate) {
        return state;
    }
    var task = getTaskById(taskId, state);
    var stateAfterUpdate = exports.taskAdapter.updateOne({
        id: taskId,
        changes: {
            timeEstimate: newEstimate,
        }
    }, state);
    return task.parentId
        ? reCalcTimeEstimateForParentIfParent(task.parentId, stateAfterUpdate)
        : stateAfterUpdate;
};
var deleteTask = function (state, taskToDelete) {
    var stateCopy = exports.taskAdapter.removeOne(taskToDelete.id, state);
    var currentTaskId = (state.currentTaskId === taskToDelete.id) ? null : state.currentTaskId;
    // PARENT TASK side effects
    // also delete from parent task if any
    if (taskToDelete.parentId) {
        var parentTask = state.entities[taskToDelete.parentId];
        var isWasLastSubTask = (parentTask.subTaskIds.length === 1);
        stateCopy = exports.taskAdapter.updateOne({
            id: taskToDelete.parentId,
            changes: __assign({ subTaskIds: stateCopy.entities[taskToDelete.parentId].subTaskIds
                    .filter(filterOutId(taskToDelete.id)) }, ((isWasLastSubTask)
                ? {
                    timeSpentOnDay: taskToDelete.timeSpentOnDay,
                    timeEstimate: taskToDelete.timeEstimate,
                }
                : {}))
        }, stateCopy);
        // also update time spent for parent if it was not copied over from sub task
        if (!isWasLastSubTask) {
            stateCopy = reCalcTimeSpentForParentIfParent(taskToDelete.parentId, stateCopy);
            stateCopy = reCalcTimeEstimateForParentIfParent(taskToDelete.parentId, stateCopy);
        }
    }
    // SUB TASK side effects
    // also delete all sub tasks if any
    if (taskToDelete.subTaskIds) {
        stateCopy = exports.taskAdapter.removeMany(taskToDelete.subTaskIds, stateCopy);
        // unset current if one of them is the current task
        currentTaskId = taskToDelete.subTaskIds.includes(currentTaskId) ? null : currentTaskId;
    }
    return __assign({}, stateCopy, { 
        // finally delete from backlog or todays tasks
        backlogTaskIds: state.backlogTaskIds.filter(filterOutId(taskToDelete.id)), todaysTaskIds: state.todaysTaskIds.filter(filterOutId(taskToDelete.id)), currentTaskId: currentTaskId, stateBefore: __assign({}, state, { stateBefore: null }) });
};
// TODO unit test the shit out of this once the model is settled
function taskReducer(state, action) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (state === void 0) { state = exports.initialTaskState; }
    switch (action.type) {
        // Meta Actions
        // ------------
        case attachment_actions_1.AttachmentActionTypes.AddAttachment: {
            var _j = action.payload.attachment, taskId = _j.taskId, id = _j.id;
            var task = state.entities[taskId];
            return __assign({}, state, { entities: __assign({}, state.entities, (_a = {}, _a[taskId] = __assign({}, task, { attachmentIds: task.attachmentIds ? task.attachmentIds.concat([id]) : [id] }), _a)), focusTaskId: taskId });
        }
        case attachment_actions_1.AttachmentActionTypes.DeleteAttachment: {
            var attachmentId_1 = action.payload.id;
            var taskIds = state.ids;
            var affectedTaskId = taskIds.find(function (id) { return state.entities[id].attachmentIds && state.entities[id].attachmentIds.includes(attachmentId_1); });
            var affectedTask = state.entities[affectedTaskId];
            return __assign({}, state, { entities: __assign({}, state.entities, (_b = {}, _b[affectedTaskId] = __assign({}, affectedTask, { attachmentIds: affectedTask.attachmentIds ? affectedTask.attachmentIds.filter(function (id_) { return id_ !== attachmentId_1; }) : [] }), _b)), focusTaskId: affectedTaskId });
        }
        case task_actions_1.TaskActionTypes.LoadTaskState: {
            var newState = action.payload.state;
            return __assign({}, newState, { currentTaskId: null, lastCurrentTaskId: newState.currentTaskId, isDataLoaded: true });
        }
        case task_actions_1.TaskActionTypes.StartFirstStartable: {
            var startableTasks = exports.filterStartableTasks(state);
            return __assign({}, state, { currentTaskId: startableTasks && startableTasks[0] || null });
        }
        case task_actions_1.TaskActionTypes.SetCurrentTask: {
            if (action.payload) {
                var subTaskIds = state.entities[action.payload].subTaskIds;
                var taskToStartId = action.payload;
                if (subTaskIds && subTaskIds.length) {
                    var undoneTasks = subTaskIds.map(function (id) { return state.entities[id]; }).filter(function (task) { return !task.isDone; });
                    taskToStartId = undoneTasks.length ? undoneTasks[0].id : subTaskIds[0];
                }
                return __assign({}, (exports.taskAdapter.updateOne({
                    id: taskToStartId,
                    changes: { isDone: false }
                }, state)), { currentTaskId: taskToStartId });
            }
            else {
                return __assign({}, state, { currentTaskId: action.payload });
            }
        }
        case task_actions_1.TaskActionTypes.UnsetCurrentTask: {
            return __assign({}, state, { currentTaskId: null, lastCurrentTaskId: state.currentTaskId });
        }
        // Task Actions
        // ------------
        case task_actions_1.TaskActionTypes.AddTask: {
            return __assign({}, exports.taskAdapter.addOne(action.payload.task, state), (action.payload.isAddToBacklog
                ? {
                    backlogTaskIds: action.payload.isAddToBottom
                        ? [
                            action.payload.task.id
                        ].concat(state.backlogTaskIds) : state.backlogTaskIds.concat([
                        action.payload.task.id,
                    ])
                }
                : {
                    todaysTaskIds: action.payload.isAddToBottom
                        ? state.todaysTaskIds.concat([
                            action.payload.task.id,
                        ]) : [
                        action.payload.task.id
                    ].concat(state.todaysTaskIds)
                }));
        }
        case task_actions_1.TaskActionTypes.UpdateTask: {
            var stateCopy = state;
            var id = action.payload.task.id;
            var _k = action.payload.task.changes, timeSpentOnDay = _k.timeSpentOnDay, timeEstimate = _k.timeEstimate, isDone = _k.isDone;
            stateCopy = updateTimeSpentForTask(id, timeSpentOnDay, stateCopy);
            stateCopy = updateTimeEstimateForTask(id, timeEstimate, stateCopy);
            return exports.taskAdapter.updateOne(action.payload.task, stateCopy);
        }
        case task_actions_1.TaskActionTypes.UpdateTaskUi: {
            return exports.taskAdapter.updateOne(action.payload.task, state);
        }
        // TODO simplify
        case task_actions_1.TaskActionTypes.ToggleTaskShowSubTasks: {
            var _l = action.payload, taskId = _l.taskId, isShowLess = _l.isShowLess, isEndless = _l.isEndless;
            var task = state.entities[taskId];
            var subTasks = task.subTaskIds.map(function (id) { return state.entities[id]; });
            var doneTasksLength = subTasks.filter(function (t) { return t.isDone; }).length;
            var isDoneTaskCaseNeeded = doneTasksLength && (doneTasksLength < subTasks.length);
            var oldVal = +task._showSubTasksMode;
            var newVal = void 0;
            if (isDoneTaskCaseNeeded) {
                newVal = oldVal + (isShowLess ? -1 : 1);
                if (isEndless) {
                    if (newVal > task_model_1.SHOW_SUB_TASKS) {
                        newVal = task_model_1.HIDE_SUB_TASKS;
                    }
                    else if (newVal < task_model_1.HIDE_SUB_TASKS) {
                        newVal = task_model_1.SHOW_SUB_TASKS;
                    }
                }
                else {
                    if (newVal > task_model_1.SHOW_SUB_TASKS) {
                        newVal = task_model_1.SHOW_SUB_TASKS;
                    }
                    if (newVal < task_model_1.HIDE_SUB_TASKS) {
                        newVal = task_model_1.HIDE_SUB_TASKS;
                    }
                }
            }
            else {
                if (isEndless) {
                    if (oldVal === task_model_1.SHOW_SUB_TASKS) {
                        newVal = task_model_1.HIDE_SUB_TASKS;
                    }
                    if (oldVal !== task_model_1.SHOW_SUB_TASKS) {
                        newVal = task_model_1.SHOW_SUB_TASKS;
                    }
                }
                else {
                    newVal = (isShowLess)
                        ? task_model_1.HIDE_SUB_TASKS
                        : task_model_1.SHOW_SUB_TASKS;
                }
            }
            // failsafe
            newVal = (isNaN(newVal)) ? task_model_1.HIDE_SUB_TASKS : newVal;
            return exports.taskAdapter.updateOne({
                id: taskId,
                changes: {
                    _showSubTasksMode: newVal
                }
            }, state);
        }
        // TODO also delete related issue :(
        case task_actions_1.TaskActionTypes.DeleteTask: {
            return deleteTask(state, action.payload.task);
        }
        case task_actions_1.TaskActionTypes.UndoDeleteTask: {
            return state.stateBefore || state;
        }
        case task_actions_1.TaskActionTypes.Move: {
            var newState = state;
            var _m = action.payload, taskId = _m.taskId, sourceModelId = _m.sourceModelId, targetModelId = _m.targetModelId, newOrderedIds = _m.newOrderedIds;
            var taskToMove = state.entities[taskId];
            switch (sourceModelId) {
                case 'DONE':
                case 'UNDONE':
                    newState = __assign({}, newState, { todaysTaskIds: newState.todaysTaskIds.filter(filterOutId(taskId)) });
                    break;
                case 'BACKLOG':
                    newState = __assign({}, newState, { backlogTaskIds: newState.backlogTaskIds.filter(filterOutId(taskId)) });
                    break;
                default:
                    // SUB TASK CASE
                    var oldPar = state.entities[sourceModelId];
                    newState = reCalcTimesForParentIfParent(oldPar.id, __assign({}, newState, { entities: __assign({}, newState.entities, (_c = {}, _c[oldPar.id] = __assign({}, oldPar, { subTaskIds: oldPar.subTaskIds.filter(filterOutId(taskId)) }), _c)) }));
            }
            switch (targetModelId) {
                case 'DONE':
                case 'UNDONE':
                    var newIndex = void 0;
                    var curInUpdateListIndex = newOrderedIds.indexOf(taskId);
                    var prevItemId = newOrderedIds[curInUpdateListIndex - 1];
                    var nextItemId = newOrderedIds[curInUpdateListIndex + 1];
                    if (prevItemId) {
                        newIndex = newState.todaysTaskIds.indexOf(prevItemId) + 1;
                    }
                    else if (nextItemId) {
                        newIndex = newState.todaysTaskIds.indexOf(nextItemId);
                    }
                    else if (targetModelId === 'DONE') {
                        newIndex = newState.todaysTaskIds.length;
                    }
                    else if (targetModelId === 'UNDONE') {
                        newIndex = 0;
                    }
                    var isDone = (targetModelId === 'DONE');
                    var newIds = newState.todaysTaskIds.slice();
                    newIds.splice(newIndex, 0, taskId);
                    return __assign({}, newState, { todaysTaskIds: newIds, entities: __assign({}, newState.entities, (_d = {}, _d[taskId] = __assign({}, taskToMove, { isDone: isDone }), _d)) }, ((isDone && taskId === state.currentTaskId) ? { currentTaskId: null } : {}));
                case 'BACKLOG':
                    return __assign({}, newState, { backlogTaskIds: newOrderedIds });
                default:
                    // SUB TASK CASE
                    var newPar = state.entities[targetModelId];
                    return reCalcTimesForParentIfParent(newPar.id, __assign({}, newState, { entities: __assign({}, newState.entities, (_e = {}, _e[newPar.id] = __assign({}, newPar, { subTaskIds: newOrderedIds }), _e[taskId] = __assign({}, taskToMove, { parentId: newPar.id }), _e)) }));
            }
        }
        case task_actions_1.TaskActionTypes.MoveUp: {
            var updatedState = state;
            var id = action.payload.id;
            var taskToMove = state.entities[id];
            if (taskToMove.parentId) {
                var parentSubTasks = state.entities[taskToMove.parentId].subTaskIds;
                updatedState = exports.taskAdapter.updateOne({
                    id: taskToMove.parentId,
                    changes: {
                        subTaskIds: array_move_1.arrayMoveLeft(parentSubTasks, id)
                    }
                }, updatedState);
            }
            return __assign({}, updatedState, { ids: array_move_1.arrayMoveLeft(state.ids, id), backlogTaskIds: array_move_1.arrayMoveLeft(state.backlogTaskIds, id), todaysTaskIds: array_move_1.arrayMoveLeft(state.todaysTaskIds, id) });
        }
        case task_actions_1.TaskActionTypes.MoveDown: {
            var updatedState = state;
            var id = action.payload.id;
            var taskToMove = state.entities[id];
            if (taskToMove.parentId) {
                var parentSubTasks = state.entities[taskToMove.parentId].subTaskIds;
                updatedState = exports.taskAdapter.updateOne({
                    id: taskToMove.parentId,
                    changes: {
                        subTaskIds: array_move_1.arrayMoveRight(parentSubTasks, id)
                    }
                }, updatedState);
            }
            return __assign({}, updatedState, { ids: array_move_1.arrayMoveRight(state.ids, id), backlogTaskIds: array_move_1.arrayMoveRight(state.backlogTaskIds, id), todaysTaskIds: array_move_1.arrayMoveRight(state.todaysTaskIds, id) });
        }
        case task_actions_1.TaskActionTypes.AddTimeSpent: {
            var _o = action.payload, id = _o.id, date = _o.date, duration = _o.duration;
            var task = getTaskById(id, state);
            var currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;
            return updateTimeSpentForTask(id, __assign({}, task.timeSpentOnDay, (_f = {}, _f[date] = (currentTimeSpentForTickDay + duration), _f)), state);
        }
        case task_actions_1.TaskActionTypes.RemoveTimeSpent: {
            var _p = action.payload, id = _p.id, date = _p.date, duration = _p.duration;
            var task = getTaskById(id, state);
            var currentTimeSpentForTickDay = task.timeSpentOnDay && +task.timeSpentOnDay[date] || 0;
            return updateTimeSpentForTask(id, __assign({}, task.timeSpentOnDay, (_g = {}, _g[date] = Math.max((currentTimeSpentForTickDay - duration), 0), _g)), state);
        }
        case task_actions_1.TaskActionTypes.FocusLastActiveTask: {
            return __assign({}, state, { focusTaskId: state.lastActiveFocusTaskId, lastActiveFocusTaskId: state.lastActiveFocusTaskId });
        }
        case task_actions_1.TaskActionTypes.RestoreTask: {
            var task = __assign({}, action.payload.task, { isDone: false });
            var tasksToAdd_1 = [mapTaskWithSubTasksToTask(task)];
            if (task.subTasks) {
                task.subTasks.forEach(function (subTask) {
                    if (subTask && subTask.id) {
                        tasksToAdd_1.push(mapTaskWithSubTasksToTask(subTask));
                    }
                });
            }
            return __assign({}, exports.taskAdapter.addMany(tasksToAdd_1, state), { todaysTaskIds: [
                    task.id
                ].concat(state.todaysTaskIds) });
        }
        case task_actions_1.TaskActionTypes.FocusTask: {
            return __assign({}, state, { focusTaskId: action.payload.id, lastActiveFocusTaskId: state.focusTaskId || state.lastActiveFocusTaskId });
        }
        case task_actions_1.TaskActionTypes.AddSubTask: {
            var _q = action.payload, task = _q.task, parentId = _q.parentId;
            var parentTask = state.entities[parentId];
            // add item1
            var stateCopy = exports.taskAdapter.addOne(__assign({}, task, { parentId: parentId }, ((parentTask.subTaskIds.length === 0 && Object.keys(task.timeSpentOnDay).length === 0)
                ? {
                    timeSpentOnDay: parentTask.timeSpentOnDay,
                    timeSpent: calc_total_time_spent_1.calcTotalTimeSpent(parentTask.timeSpentOnDay)
                }
                : {}), ((parentTask.subTaskIds.length === 0 && !task.timeEstimate)
                ? { timeEstimate: parentTask.timeEstimate }
                : {})), state);
            return __assign({}, stateCopy, { 
                // focus new task
                focusTaskId: task.id }, ((state.currentTaskId === parentId)
                ? { currentTaskId: task.id }
                : {}), { 
                // also add to parent task
                entities: __assign({}, stateCopy.entities, (_h = {}, _h[parentId] = __assign({}, parentTask, { subTaskIds: parentTask.subTaskIds.concat([task.id]) }), _h)) });
        }
        case task_actions_1.TaskActionTypes.MoveToToday: {
            if (state.todaysTaskIds.includes(action.payload.id)) {
                return state;
            }
            var task = state.entities[action.payload.id];
            if (!task || task.parentId) {
                console.error('Trying to move sub task to todays list. This should not happen');
                return state;
            }
            return __assign({}, state, { backlogTaskIds: state.backlogTaskIds.filter(filterOutId(action.payload.id)), todaysTaskIds: action.payload.isMoveToTop
                    ? [action.payload.id].concat(state.todaysTaskIds) : state.todaysTaskIds.concat([action.payload.id]) });
        }
        case task_actions_1.TaskActionTypes.MoveToBacklog: {
            if (state.backlogTaskIds.includes(action.payload.id)) {
                return state;
            }
            return __assign({}, state, { todaysTaskIds: state.todaysTaskIds.filter(filterOutId(action.payload.id)), backlogTaskIds: [action.payload.id].concat(state.backlogTaskIds) });
        }
        case task_actions_1.TaskActionTypes.MoveToArchive: {
            var copyState_1 = state;
            action.payload.tasks.forEach(function (task) {
                copyState_1 = deleteTask(copyState_1, task);
            });
            return __assign({}, copyState_1);
        }
        case task_actions_1.TaskActionTypes.ToggleStart: {
            if (state.currentTaskId) {
                return __assign({}, state, { lastCurrentTaskId: state.currentTaskId });
            }
            return state;
        }
        default: {
            return state;
        }
    }
}
exports.taskReducer = taskReducer;
//# sourceMappingURL=task.reducer.js.map