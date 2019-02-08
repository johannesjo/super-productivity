import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment-mini';


@Pipe({
  name: 'humanizeTimestamp'
})
export class HumanizeTimestampPipe implements PipeTransform {
  transform(value: any): any {
    if (value) {
      return moment(value).fromNow();
    }
  }
}
