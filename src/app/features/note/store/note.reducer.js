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
var note_actions_1 = require("./note.actions");
var store_1 = require("@ngrx/store");
exports.adapter = entity_1.createEntityAdapter();
exports.initialNoteState = exports.adapter.getInitialState({
    // additional entity state properties
    isShowNotes: false,
});
exports.selectIds = (_a = exports.adapter.getSelectors(), _a.selectIds), exports.selectEntities = _a.selectEntities, exports.selectAll = _a.selectAll, exports.selectTotal = _a.selectTotal;
exports.NOTE_FEATURE_NAME = 'note';
exports.selectNoteFeatureState = store_1.createFeatureSelector(exports.NOTE_FEATURE_NAME);
exports.selectAllNotes = store_1.createSelector(exports.selectNoteFeatureState, exports.selectAll);
exports.selectIsShowNotes = store_1.createSelector(exports.selectNoteFeatureState, function (state) { return state.isShowNotes; });
exports.selectNoteById = store_1.createSelector(exports.selectNoteFeatureState, function (state, props) { return state.entities[props.id]; });
function reducer(state, action) {
    if (state === void 0) { state = exports.initialNoteState; }
    var _a;
    switch (action.type) {
        case note_actions_1.NoteActionTypes.LoadNoteState: {
            return __assign({}, action.payload.state);
        }
        case note_actions_1.NoteActionTypes.ToggleShowNotes: {
            return __assign({}, state, { isShowNotes: !state.isShowNotes });
        }
        case note_actions_1.NoteActionTypes.HideNotes: {
            return __assign({}, state, { isShowNotes: false });
        }
        case note_actions_1.NoteActionTypes.UpdateNoteOrder: {
            return __assign({}, state, { ids: action.payload.ids });
        }
        case note_actions_1.NoteActionTypes.AddNote: {
            // return adapter.addOne(action.payload.note, state);
            // add to top rather than bottom
            return __assign({}, state, { entities: __assign({}, state.entities, (_a = {}, _a[action.payload.note.id] = action.payload.note, _a)), ids: [action.payload.note.id].concat(state.ids) });
        }
        case note_actions_1.NoteActionTypes.UpsertNote: {
            return exports.adapter.upsertOne(action.payload.note, state);
        }
        case note_actions_1.NoteActionTypes.AddNotes: {
            return exports.adapter.addMany(action.payload.notes, state);
        }
        case note_actions_1.NoteActionTypes.UpsertNotes: {
            return exports.adapter.upsertMany(action.payload.notes, state);
        }
        case note_actions_1.NoteActionTypes.UpdateNote: {
            return exports.adapter.updateOne(action.payload.note, state);
        }
        case note_actions_1.NoteActionTypes.UpdateNotes: {
            return exports.adapter.updateMany(action.payload.notes, state);
        }
        case note_actions_1.NoteActionTypes.DeleteNote: {
            return exports.adapter.removeOne(action.payload.id, state);
        }
        case note_actions_1.NoteActionTypes.DeleteNotes: {
            return exports.adapter.removeMany(action.payload.ids, state);
        }
        case note_actions_1.NoteActionTypes.ClearNotes: {
            return exports.adapter.removeAll(state);
        }
        default: {
            return state;
        }
    }
}
exports.reducer = reducer;
//# sourceMappingURL=note.reducer.js.map