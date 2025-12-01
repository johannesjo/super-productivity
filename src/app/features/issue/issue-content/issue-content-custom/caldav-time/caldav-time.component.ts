import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { LocaleDatePipe } from 'src/app/ui/pipes/locale-date.pipe';
import { TaskCopy } from '../../../../tasks/task.model';
import { IssueData } from '../../../issue.model';
import { IssueFieldConfig } from '../../issue-content.model';

@Component({
  selector: 'caldav-time',
  templateUrl: './caldav-time.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
})
export class CaldavTimeComponent {
  private _datePipe = inject(LocaleDatePipe);

  readonly field = input.required<IssueFieldConfig>();
  readonly issue = input.required<IssueData>();
  readonly task = input.required<TaskCopy>();

  fieldValue = computed(() => {
    const field = this.field();
    const issue = this.issue();

    if (typeof field.value === 'function') {
      return field.value(issue);
    }

    // Handle nested fields like 'status.name'
    const keys = field.value.split('.');
    let value: any = issue;
    for (const key of keys) {
      value = value?.[key];
    }

    const date = new Date(value);
    const isOnlyDate =
      date.getHours() == 0 && date.getMinutes() == 0 && date.getSeconds() == 0;
    return this._datePipe.transform(date, isOnlyDate ? 'shortDate' : 'short');
  });
}
