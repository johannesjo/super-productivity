"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var NoteActionTypes;
(function (NoteActionTypes) {
    NoteActionTypes["LoadNoteState"] = "[Note] Load Note State";
    NoteActionTypes["ToggleShowNotes"] = "[Note] ToggleShow Notes";
    NoteActionTypes["HideNotes"] = "[Note] Hide Notes";
    NoteActionTypes["UpdateNoteOrder"] = "[Note] Update Note Order";
    NoteActionTypes["AddNote"] = "[Note] Add Note";
    NoteActionTypes["UpsertNote"] = "[Note] Upsert Note";
    NoteActionTypes["AddNotes"] = "[Note] Add Notes";
    NoteActionTypes["UpsertNotes"] = "[Note] Upsert Notes";
    NoteActionTypes["UpdateNote"] = "[Note] Update Note";
    NoteActionTypes["UpdateNotes"] = "[Note] Update Notes";
    NoteActionTypes["DeleteNote"] = "[Note] Delete Note";
    NoteActionTypes["DeleteNotes"] = "[Note] Delete Notes";
    NoteActionTypes["ClearNotes"] = "[Note] Clear Notes";
    // Reminders
    NoteActionTypes["AddNoteReminder"] = "[Note] Add reminder";
    NoteActionTypes["UpdateNoteReminder"] = "[Note] Update reminder";
    NoteActionTypes["RemoveNoteReminder"] = "[Note] Remove reminder";
})(NoteActionTypes = exports.NoteActionTypes || (exports.NoteActionTypes = {}));
var LoadNoteState = /** @class */ (function () {
    function LoadNoteState(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.LoadNoteState;
    }
    return LoadNoteState;
}());
exports.LoadNoteState = LoadNoteState;
var ToggleShowNotes = /** @class */ (function () {
    function ToggleShowNotes() {
        this.type = NoteActionTypes.ToggleShowNotes;
    }
    return ToggleShowNotes;
}());
exports.ToggleShowNotes = ToggleShowNotes;
var HideNotes = /** @class */ (function () {
    function HideNotes() {
        this.type = NoteActionTypes.HideNotes;
    }
    return HideNotes;
}());
exports.HideNotes = HideNotes;
var UpdateNoteOrder = /** @class */ (function () {
    function UpdateNoteOrder(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.UpdateNoteOrder;
    }
    return UpdateNoteOrder;
}());
exports.UpdateNoteOrder = UpdateNoteOrder;
var AddNote = /** @class */ (function () {
    function AddNote(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.AddNote;
    }
    return AddNote;
}());
exports.AddNote = AddNote;
var UpsertNote = /** @class */ (function () {
    function UpsertNote(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.UpsertNote;
    }
    return UpsertNote;
}());
exports.UpsertNote = UpsertNote;
var AddNotes = /** @class */ (function () {
    function AddNotes(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.AddNotes;
    }
    return AddNotes;
}());
exports.AddNotes = AddNotes;
var UpsertNotes = /** @class */ (function () {
    function UpsertNotes(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.UpsertNotes;
    }
    return UpsertNotes;
}());
exports.UpsertNotes = UpsertNotes;
var UpdateNote = /** @class */ (function () {
    function UpdateNote(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.UpdateNote;
    }
    return UpdateNote;
}());
exports.UpdateNote = UpdateNote;
var UpdateNotes = /** @class */ (function () {
    function UpdateNotes(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.UpdateNotes;
    }
    return UpdateNotes;
}());
exports.UpdateNotes = UpdateNotes;
var DeleteNote = /** @class */ (function () {
    function DeleteNote(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.DeleteNote;
    }
    return DeleteNote;
}());
exports.DeleteNote = DeleteNote;
var DeleteNotes = /** @class */ (function () {
    function DeleteNotes(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.DeleteNotes;
    }
    return DeleteNotes;
}());
exports.DeleteNotes = DeleteNotes;
var ClearNotes = /** @class */ (function () {
    function ClearNotes() {
        this.type = NoteActionTypes.ClearNotes;
    }
    return ClearNotes;
}());
exports.ClearNotes = ClearNotes;
// Reminder Actions
var AddNoteReminder = /** @class */ (function () {
    function AddNoteReminder(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.AddNoteReminder;
    }
    return AddNoteReminder;
}());
exports.AddNoteReminder = AddNoteReminder;
var UpdateNoteReminder = /** @class */ (function () {
    function UpdateNoteReminder(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.UpdateNoteReminder;
    }
    return UpdateNoteReminder;
}());
exports.UpdateNoteReminder = UpdateNoteReminder;
var RemoveNoteReminder = /** @class */ (function () {
    function RemoveNoteReminder(payload) {
        this.payload = payload;
        this.type = NoteActionTypes.RemoveNoteReminder;
    }
    return RemoveNoteReminder;
}());
exports.RemoveNoteReminder = RemoveNoteReminder;
//# sourceMappingURL=note.actions.js.map