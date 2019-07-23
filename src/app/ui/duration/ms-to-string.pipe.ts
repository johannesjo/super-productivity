import {Pipe, PipeTransform} from '@angular/core';
import * as moment from 'moment';

export const msToString = (value: any, showSeconds?: boolean, isHideEmptyPlaceholder?: boolean): string => {
  const md = moment.duration(value);
  let hours = 0;
  if (+md.days() > 0) {
    hours = (md.days() * 24);
  }
  if (+md.hours() > 0) {
    hours += md.hours();
  }
  const parsed =
    // ((+md.days() > 0) ? (md.days() + 'd ') : '')
    ((hours > 0) ? (hours + 'h ') : '')
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

