"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isImageUrlSimple(url) {
    return (url.match(/\.(jpeg|jpg|gif|png)$/i) != null);
}
exports.isImageUrlSimple = isImageUrlSimple;
function isImageUrl(url) {
    return new Promise(function (resolve) {
        var timeout = 5000;
        var img = new Image();
        var timedOut = false;
        img.onerror = img.onabort = function () {
            if (!timedOut) {
                clearTimeout(timer);
                resolve(false);
            }
        };
        img.onload = function () {
            if (!timedOut) {
                clearTimeout(timer);
                resolve(true);
            }
        };
        img.src = url;
        var timer = setTimeout(function () {
            timedOut = true;
            // reset .src to invalid URL so it stops previous
            // loading, but doesn't trigger new load
            img.src = '//!!!!/test.jpg';
            resolve(false);
        }, timeout);
    });
}
exports.isImageUrl = isImageUrl;
//# sourceMappingURL=is-image-url.js.map