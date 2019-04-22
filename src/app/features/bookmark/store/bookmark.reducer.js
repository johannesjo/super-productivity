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
var bookmark_actions_1 = require("./bookmark.actions");
var store_1 = require("@ngrx/store");
exports.BOOKMARK_FEATURE_NAME = 'bookmark';
exports.adapter = entity_1.createEntityAdapter();
exports.selectBookmarkFeatureState = store_1.createFeatureSelector(exports.BOOKMARK_FEATURE_NAME);
exports.selectIds = (_a = exports.adapter.getSelectors(), _a.selectIds), exports.selectEntities = _a.selectEntities, exports.selectAll = _a.selectAll, exports.selectTotal = _a.selectTotal;
exports.selectAllBookmarks = store_1.createSelector(exports.selectBookmarkFeatureState, exports.selectAll);
exports.selectIsShowBookmarkBar = store_1.createSelector(exports.selectBookmarkFeatureState, function (state) { return state.isShowBookmarks; });
exports.initialBookmarkState = exports.adapter.getInitialState({
    // additional entity state properties
    isShowBookmarks: false
});
function bookmarkReducer(state, action) {
    if (state === void 0) { state = exports.initialBookmarkState; }
    switch (action.type) {
        case bookmark_actions_1.BookmarkActionTypes.AddBookmark: {
            return exports.adapter.addOne(action.payload.bookmark, state);
        }
        case bookmark_actions_1.BookmarkActionTypes.UpdateBookmark: {
            return exports.adapter.updateOne(action.payload.bookmark, state);
        }
        case bookmark_actions_1.BookmarkActionTypes.DeleteBookmark: {
            return exports.adapter.removeOne(action.payload.id, state);
        }
        case bookmark_actions_1.BookmarkActionTypes.LoadBookmarkState:
            return __assign({}, action.payload.state);
        case bookmark_actions_1.BookmarkActionTypes.ShowBookmarks:
            return __assign({}, state, { isShowBookmarks: true });
        case bookmark_actions_1.BookmarkActionTypes.HideBookmarks:
            return __assign({}, state, { isShowBookmarks: false });
        case bookmark_actions_1.BookmarkActionTypes.ToggleBookmarks:
            return __assign({}, state, { isShowBookmarks: !state.isShowBookmarks });
        case bookmark_actions_1.BookmarkActionTypes.ReorderBookmarks: {
            var oldIds = state.ids;
            var newIds = action.payload.ids;
            if (!oldIds || !newIds) {
                return state;
            }
            // check if we have the same values inside the arrays
            if (oldIds.slice(0).sort().join(',') === newIds.slice(0).sort().join(',')) {
                return __assign({}, state, { ids: newIds });
            }
            else {
                console.error('Bookmark lost while reordering. Not executing reorder');
                return state;
            }
        }
        default: {
            return state;
        }
    }
}
exports.bookmarkReducer = bookmarkReducer;
//# sourceMappingURL=bookmark.reducer.js.map