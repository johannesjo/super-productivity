"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TaskActionTypes;
(function (TaskActionTypes) {
    TaskActionTypes["LoadTaskState"] = "[Task] Load Task State";
    TaskActionTypes["SetCurrentTask"] = "[Task] SetCurrentTask";
    TaskActionTypes["UnsetCurrentTask"] = "[Task] UnsetCurrentTask";
    // Task Actions
    TaskActionTypes["AddTask"] = "[Task][Issue] Add Task";
    TaskActionTypes["UpdateTaskUi"] = "[Task] Update Task Ui";
    TaskActionTypes["ToggleTaskShowSubTasks"] = "[Task] Toggle Show Sub Tasks";
    TaskActionTypes["UpdateTask"] = "[Task] Update Task";
    TaskActionTypes["UpdateTasks"] = "[Task] Update Tasks";
    TaskActionTypes["DeleteTask"] = "[Task] Delete Task";
    TaskActionTypes["UndoDeleteTask"] = "[Task] Undo Delete Task";
    TaskActionTypes["Move"] = "[Task] Move task";
    TaskActionTypes["MoveUp"] = "[Task] Move up";
    TaskActionTypes["MoveDown"] = "[Task] Move down";
    TaskActionTypes["AddTimeSpent"] = "[Task] Add time spent";
    TaskActionTypes["RemoveTimeSpent"] = "[Task] Remove time spent";
    // Reminders
    TaskActionTypes["AddTaskReminder"] = "[Task] Add reminder";
    TaskActionTypes["UpdateTaskReminder"] = "[Task] Update reminder";
    TaskActionTypes["RemoveTaskReminder"] = "[Task] Remove reminder";
    // Sub Task Actions
    TaskActionTypes["AddSubTask"] = "[Task] Add SubTask";
    // Other
    TaskActionTypes["StartFirstStartable"] = "[Task] Start first startable Task";
    TaskActionTypes["RestoreTask"] = "[Task] Restore Task";
    TaskActionTypes["FocusTask"] = "[Task] Focus Task";
    TaskActionTypes["FocusLastActiveTask"] = "[Task] Focus last active Task";
    TaskActionTypes["MoveToBacklog"] = "[Task] Move to backlog";
    TaskActionTypes["MoveToToday"] = "[Task] Move to today";
    TaskActionTypes["MoveToArchive"] = "[Task] Move to archive";
    TaskActionTypes["ToggleStart"] = "[Task] Toggle start";
    TaskActionTypes["RoundTimeSpentForDay"] = "[Task] RoundTimeSpentForDay";
})(TaskActionTypes = exports.TaskActionTypes || (exports.TaskActionTypes = {}));
var LoadTaskState = /** @class */ (function () {
    function LoadTaskState(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.LoadTaskState;
    }
    return LoadTaskState;
}());
exports.LoadTaskState = LoadTaskState;
var SetCurrentTask = /** @class */ (function () {
    function SetCurrentTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.SetCurrentTask;
    }
    return SetCurrentTask;
}());
exports.SetCurrentTask = SetCurrentTask;
var UnsetCurrentTask = /** @class */ (function () {
    function UnsetCurrentTask() {
        this.type = TaskActionTypes.UnsetCurrentTask;
    }
    return UnsetCurrentTask;
}());
exports.UnsetCurrentTask = UnsetCurrentTask;
var AddTask = /** @class */ (function () {
    function AddTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.AddTask;
    }
    return AddTask;
}());
exports.AddTask = AddTask;
var UpdateTask = /** @class */ (function () {
    function UpdateTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.UpdateTask;
    }
    return UpdateTask;
}());
exports.UpdateTask = UpdateTask;
var UpdateTaskUi = /** @class */ (function () {
    function UpdateTaskUi(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.UpdateTaskUi;
    }
    return UpdateTaskUi;
}());
exports.UpdateTaskUi = UpdateTaskUi;
var ToggleTaskShowSubTasks = /** @class */ (function () {
    function ToggleTaskShowSubTasks(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.ToggleTaskShowSubTasks;
    }
    return ToggleTaskShowSubTasks;
}());
exports.ToggleTaskShowSubTasks = ToggleTaskShowSubTasks;
var UpdateTasks = /** @class */ (function () {
    function UpdateTasks(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.UpdateTasks;
    }
    return UpdateTasks;
}());
exports.UpdateTasks = UpdateTasks;
var DeleteTask = /** @class */ (function () {
    function DeleteTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.DeleteTask;
    }
    return DeleteTask;
}());
exports.DeleteTask = DeleteTask;
var UndoDeleteTask = /** @class */ (function () {
    function UndoDeleteTask() {
        this.type = TaskActionTypes.UndoDeleteTask;
    }
    return UndoDeleteTask;
}());
exports.UndoDeleteTask = UndoDeleteTask;
var Move = /** @class */ (function () {
    function Move(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.Move;
    }
    return Move;
}());
exports.Move = Move;
var MoveUp = /** @class */ (function () {
    function MoveUp(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.MoveUp;
    }
    return MoveUp;
}());
exports.MoveUp = MoveUp;
var MoveDown = /** @class */ (function () {
    function MoveDown(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.MoveDown;
    }
    return MoveDown;
}());
exports.MoveDown = MoveDown;
var AddTimeSpent = /** @class */ (function () {
    function AddTimeSpent(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.AddTimeSpent;
    }
    return AddTimeSpent;
}());
exports.AddTimeSpent = AddTimeSpent;
var RemoveTimeSpent = /** @class */ (function () {
    function RemoveTimeSpent(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.RemoveTimeSpent;
    }
    return RemoveTimeSpent;
}());
exports.RemoveTimeSpent = RemoveTimeSpent;
// Reminder Actions
var AddTaskReminder = /** @class */ (function () {
    function AddTaskReminder(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.AddTaskReminder;
    }
    return AddTaskReminder;
}());
exports.AddTaskReminder = AddTaskReminder;
var UpdateTaskReminder = /** @class */ (function () {
    function UpdateTaskReminder(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.UpdateTaskReminder;
    }
    return UpdateTaskReminder;
}());
exports.UpdateTaskReminder = UpdateTaskReminder;
var RemoveTaskReminder = /** @class */ (function () {
    function RemoveTaskReminder(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.RemoveTaskReminder;
    }
    return RemoveTaskReminder;
}());
exports.RemoveTaskReminder = RemoveTaskReminder;
var StartFirstStartable = /** @class */ (function () {
    function StartFirstStartable() {
        this.type = TaskActionTypes.StartFirstStartable;
    }
    return StartFirstStartable;
}());
exports.StartFirstStartable = StartFirstStartable;
var RestoreTask = /** @class */ (function () {
    function RestoreTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.RestoreTask;
    }
    return RestoreTask;
}());
exports.RestoreTask = RestoreTask;
var FocusTask = /** @class */ (function () {
    function FocusTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.FocusTask;
    }
    return FocusTask;
}());
exports.FocusTask = FocusTask;
var FocusLastActiveTask = /** @class */ (function () {
    function FocusLastActiveTask() {
        this.type = TaskActionTypes.FocusLastActiveTask;
    }
    return FocusLastActiveTask;
}());
exports.FocusLastActiveTask = FocusLastActiveTask;
var AddSubTask = /** @class */ (function () {
    function AddSubTask(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.AddSubTask;
    }
    return AddSubTask;
}());
exports.AddSubTask = AddSubTask;
var MoveToBacklog = /** @class */ (function () {
    function MoveToBacklog(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.MoveToBacklog;
    }
    return MoveToBacklog;
}());
exports.MoveToBacklog = MoveToBacklog;
var MoveToToday = /** @class */ (function () {
    function MoveToToday(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.MoveToToday;
    }
    return MoveToToday;
}());
exports.MoveToToday = MoveToToday;
var MoveToArchive = /** @class */ (function () {
    function MoveToArchive(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.MoveToArchive;
    }
    return MoveToArchive;
}());
exports.MoveToArchive = MoveToArchive;
var ToggleStart = /** @class */ (function () {
    function ToggleStart() {
        this.type = TaskActionTypes.ToggleStart;
    }
    return ToggleStart;
}());
exports.ToggleStart = ToggleStart;
var RoundTimeSpentForDay = /** @class */ (function () {
    function RoundTimeSpentForDay(payload) {
        this.payload = payload;
        this.type = TaskActionTypes.RoundTimeSpentForDay;
    }
    return RoundTimeSpentForDay;
}());
exports.RoundTimeSpentForDay = RoundTimeSpentForDay;
//# sourceMappingURL=task.actions.js.map