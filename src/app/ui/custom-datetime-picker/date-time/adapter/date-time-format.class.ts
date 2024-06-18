/**
 * date-time-format.class
 */

import { InjectionToken } from '@angular/core';

export interface OwlDateTimeFormats {
  parseInput: any;
  fullPickerInput: any;
  datePickerInput: any;
  timePickerInput: any;
  monthYearLabel: any;
  dateA11yLabel: any;
  monthYearA11yLabel: any;
}

/** InjectionToken for date time picker that can be used to override default format. */
export const OWL_DATE_TIME_FORMATS = new InjectionToken<OwlDateTimeFormats>(
  'OWL_DATE_TIME_FORMATS',
);
