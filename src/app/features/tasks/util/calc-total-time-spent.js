"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcTotalTimeSpent = function (timeSpentOnDay) {
    var totalTimeSpent = 0;
    Object.keys(timeSpentOnDay).forEach(function (strDate) {
        if (timeSpentOnDay[strDate]) {
            totalTimeSpent += (+timeSpentOnDay[strDate]);
        }
    });
    return totalTimeSpent;
};
//# sourceMappingURL=calc-total-time-spent.js.map