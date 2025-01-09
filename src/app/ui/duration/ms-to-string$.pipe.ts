import { Pipe, PipeTransform } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { msToString } from './ms-to-string.pipe';

@Pipe({ name: 'msToString$' })
export class MsToStringPipe$ implements PipeTransform {
  transform(value$: Observable<any> | undefined, showSeconds?: boolean): any {
    if (value$) {
      value$.pipe(
        map((value) => {
          return msToString(value, showSeconds);
        }),
      );
    }
  }
}
