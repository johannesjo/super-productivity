import { Injectable } from '@angular/core';
import { getLocalDateStr } from '../../util/get-local-date-str';

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
    return getLocalDateStr(date);
  }
}
