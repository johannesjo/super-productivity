import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'momentFormat',
})
export class MomentFormatPipe implements PipeTransform {
  transform(value: any, args: any): any {
    if (value && args) {
      return moment(value).format(args);
    }
    return null;
  }
}
