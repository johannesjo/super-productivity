"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BookmarkActionTypes;
(function (BookmarkActionTypes) {
    BookmarkActionTypes["LoadBookmarkState"] = "[Bookmark] Load Bookmark State";
    BookmarkActionTypes["AddBookmark"] = "[Bookmark] Add Bookmark";
    BookmarkActionTypes["UpdateBookmark"] = "[Bookmark] Update Bookmark";
    BookmarkActionTypes["DeleteBookmark"] = "[Bookmark] Delete Bookmark";
    BookmarkActionTypes["ShowBookmarks"] = "[Bookmark] Show Bookmarks";
    BookmarkActionTypes["HideBookmarks"] = "[Bookmark] Hide Bookmarks";
    BookmarkActionTypes["ToggleBookmarks"] = "[Bookmark] Toggle Bookmarks";
    BookmarkActionTypes["ReorderBookmarks"] = "[Bookmark] Reorder Bookmarks";
})(BookmarkActionTypes = exports.BookmarkActionTypes || (exports.BookmarkActionTypes = {}));
var LoadBookmarkState = /** @class */ (function () {
    function LoadBookmarkState(payload) {
        this.payload = payload;
        this.type = BookmarkActionTypes.LoadBookmarkState;
    }
    return LoadBookmarkState;
}());
exports.LoadBookmarkState = LoadBookmarkState;
var AddBookmark = /** @class */ (function () {
    function AddBookmark(payload) {
        this.payload = payload;
        this.type = BookmarkActionTypes.AddBookmark;
    }
    return AddBookmark;
}());
exports.AddBookmark = AddBookmark;
var UpdateBookmark = /** @class */ (function () {
    function UpdateBookmark(payload) {
        this.payload = payload;
        this.type = BookmarkActionTypes.UpdateBookmark;
    }
    return UpdateBookmark;
}());
exports.UpdateBookmark = UpdateBookmark;
var DeleteBookmark = /** @class */ (function () {
    function DeleteBookmark(payload) {
        this.payload = payload;
        this.type = BookmarkActionTypes.DeleteBookmark;
    }
    return DeleteBookmark;
}());
exports.DeleteBookmark = DeleteBookmark;
var ShowBookmarks = /** @class */ (function () {
    function ShowBookmarks() {
        this.type = BookmarkActionTypes.ShowBookmarks;
    }
    return ShowBookmarks;
}());
exports.ShowBookmarks = ShowBookmarks;
var HideBookmarks = /** @class */ (function () {
    function HideBookmarks() {
        this.type = BookmarkActionTypes.HideBookmarks;
    }
    return HideBookmarks;
}());
exports.HideBookmarks = HideBookmarks;
var ToggleBookmarks = /** @class */ (function () {
    function ToggleBookmarks() {
        this.type = BookmarkActionTypes.ToggleBookmarks;
    }
    return ToggleBookmarks;
}());
exports.ToggleBookmarks = ToggleBookmarks;
var ReorderBookmarks = /** @class */ (function () {
    function ReorderBookmarks(payload) {
        this.payload = payload;
        this.type = BookmarkActionTypes.ReorderBookmarks;
    }
    return ReorderBookmarks;
}());
exports.ReorderBookmarks = ReorderBookmarks;
//# sourceMappingURL=bookmark.actions.js.map