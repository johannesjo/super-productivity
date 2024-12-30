import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';

@Pipe({ name: 'humanizeTimestamp' })
export class HumanizeTimestampPipe implements PipeTransform {
  transform(value: any): any {
    if (value) {
      return moment(value).fromNow();
    }
  }
}
