"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var is_image_url_1 = require("../../util/is-image-url");
var DropPasteIcons;
(function (DropPasteIcons) {
    DropPasteIcons["FILE"] = "insert_drive_file";
    DropPasteIcons["LINK"] = "bookmark";
    DropPasteIcons["IMG"] = "image";
    DropPasteIcons["COMMAND"] = "laptop_windows";
    DropPasteIcons["NOTE"] = "note";
})(DropPasteIcons = exports.DropPasteIcons || (exports.DropPasteIcons = {}));
exports.createFromDrop = function (ev) {
    var text = ev.dataTransfer.getData('text');
    return text
        ? (_createTextBookmark(text))
        : (_createFileBookmark(ev.dataTransfer));
};
exports.createFromPaste = function (ev) {
    if (ev.target.getAttribute('contenteditable')) {
        return;
    }
    var text = ev.clipboardData.getData('text/plain');
    if (text) {
        return _createTextBookmark(text);
    }
    return null;
};
function _createTextBookmark(text) {
    if (text) {
        if (text.match(/\n/)) {
            // addItem({
            //  title: text.substr(0, MAX_TITLE_LENGTH),
            //  type: 'TEXT'
            // });
        }
        else {
            var path = text;
            if (!path.match(/^http/)) {
                path = '//' + path;
            }
            var isImage = is_image_url_1.isImageUrlSimple(path);
            return {
                title: _baseName(text),
                path: path,
                type: isImage ? 'IMG' : 'LINK',
                icon: isImage ? DropPasteIcons.IMG : DropPasteIcons.LINK,
            };
        }
    }
    return null;
}
function _createFileBookmark(dataTransfer) {
    var path = dataTransfer.files[0] && dataTransfer.files[0].path;
    if (path) {
        return {
            title: _baseName(path),
            path: path,
            type: 'FILE',
            icon: DropPasteIcons.FILE,
        };
    }
    return null;
}
function _baseName(passedStr) {
    var str = passedStr.trim();
    var base;
    if (str[str.length - 1] === '/') {
        var strippedStr = str.substring(0, str.length - 2);
        base = strippedStr.substring(strippedStr.lastIndexOf('/') + 1);
    }
    else {
        base = str.substring(str.lastIndexOf('/') + 1);
    }
    if (base.lastIndexOf('.') !== -1) {
        base = base.substring(0, base.lastIndexOf('.'));
    }
    return base;
}
//# sourceMappingURL=drop-paste-input.js.map