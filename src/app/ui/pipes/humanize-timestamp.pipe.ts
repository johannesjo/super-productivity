import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { humanizeTimestamp } from '../../util/humanize-timestamp';

@Pipe({ name: 'humanizeTimestamp' })
export class HumanizeTimestampPipe implements PipeTransform {
  private translateService = inject(TranslateService);

  transform(value: number | Date | string): string {
    return humanizeTimestamp(value, this.translateService);
  }
}
