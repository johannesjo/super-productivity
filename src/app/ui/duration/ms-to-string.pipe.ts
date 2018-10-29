import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

export const msToString = (value: any, showSeconds?: boolean, isHideEmptyPlaceholder?: boolean): string => {
  const md = moment.duration(value);
  const parsed =
    ((+md.days() > 0) ? (md.days() + 'd ') : '')
    + ((+md.hours() > 0) ? (md.hours() + 'h ') : '')
    + ((+md.minutes() > 0) ? (md.minutes() + 'm ') : '')
    + (showSeconds && (+md.seconds() > 0) ? (md.seconds() + 's ') : '');
  if (!isHideEmptyPlaceholder && parsed.trim() === '') {
    return '-';
  }

  return parsed.trim();
};

@Pipe({
  name: 'msToString'
})
export class MsToStringPipe implements PipeTransform {
  transform = msToString;
}

