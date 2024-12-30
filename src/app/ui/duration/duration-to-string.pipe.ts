import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'durationToString' })
export class DurationToStringPipe implements PipeTransform {
  transform: (value: any, ...args: any[]) => any = durationToString;
}

export const durationToString = (momentDuration: any, args?: any): any => {
  const md = Object.assign({}, momentDuration);
  let val;

  if (md) {
    // if moment duration object
    if (md.duration || md._milliseconds) {
      const dd = (md.duration && md.duration()._data) || md._data;
      val = '';
      val += (parseInt(dd.days, 10) > 0 && dd.days + 'd ') || '';
      val += (parseInt(dd.hours, 10) > 0 && dd.hours + 'h ') || '';
      val += (parseInt(dd.minutes, 10) > 0 && dd.minutes + 'm ') || '';
      val += (parseInt(dd.seconds, 10) > 0 && dd.seconds + 's ') || '';
      val = val.trim();

      // if moment duration string
    } else if (md.replace) {
      val = md.replace('PT', '');
      val = val.toLowerCase(val);
      val = val.replace(/(d|h|m|s)/g, '$1 ');
      val = val.trim();
    }
  }

  return val || '';
};
