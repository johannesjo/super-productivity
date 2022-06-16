import { Injectable } from '@angular/core';
import { getWorklogStr } from '../../util/get-work-log-str';

@Injectable({ providedIn: 'root' })
export class DateService {
  startOfNextDayDiff: number = 0;

  setStartOfNextDayDiff(startOfNextDay: number): void {
    this.startOfNextDayDiff = (startOfNextDay || 0) * 60 * 60 * 1000;
  }

  todayStr(date?: Date | number): string {
    if (!date) {
      date = new Date(Date.now() - this.startOfNextDayDiff);
    }
    return getWorklogStr(date);
  }
}
