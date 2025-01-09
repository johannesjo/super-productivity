import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

export const msToMinuteClockString = (value: any): string => {
  const md = moment.duration(value);
  let hours = 0;
  let minutes = 0;
  if (+md.days() > 0) {
    hours = md.days() * 24;
  }
  if (+md.hours() > 0) {
    hours += md.hours();
  }

  minutes = hours * 60;
  if (+md.minutes() > 0) {
    minutes += +md.minutes();
  }

  const parsed = minutes + ':' + ('00' + +md.seconds()).slice(-2);

  return parsed.trim();
};

@Pipe({ name: 'msToMinuteClockString' })
export class MsToMinuteClockStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = msToMinuteClockString;
}
