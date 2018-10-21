import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'msToString'
})
export class MsToStringPipe implements PipeTransform {

  transform(value: any, showSeconds?: boolean): any {
    const md = moment.duration(value);
    const parsed =
      ((+md.days() > 0) ? (md.days() + 'd ') : '')
      + ((+md.hours() > 0) ? (md.hours() + 'h ') : '')
      + ((+md.minutes() > 0) ? (md.minutes() + 'm ') : '')
      + (showSeconds && (+md.seconds() > 0) ? (md.seconds() + 's ') : '');
    return parsed.trim();
  }
}
