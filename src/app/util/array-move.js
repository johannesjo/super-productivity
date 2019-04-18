"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayMove = function (arr_, from, to, on) {
    if (on === void 0) { on = 1; }
    var arr = arr_.splice(0);
    arr.splice.apply(arr, [to, 0].concat(arr.splice(from, on)));
    return arr;
};
exports.arrayMoveLeft = function (arr, val) {
    if (!arr.includes(val)) {
        return arr;
    }
    var oldIndex = arr.indexOf(val);
    var newIndex = oldIndex - 1;
    if (newIndex >= 0) {
        return exports.arrayMove(arr, oldIndex, newIndex);
    }
    return arr;
};
exports.arrayMoveRight = function (arr, val) {
    if (!arr.includes(val)) {
        return arr;
    }
    var oldIndex = arr.indexOf(val);
    var newIndex = oldIndex + 1;
    if (newIndex < arr.length) {
        return exports.arrayMove(arr, oldIndex, newIndex);
    }
    return arr;
};
//# sourceMappingURL=array-move.js.map