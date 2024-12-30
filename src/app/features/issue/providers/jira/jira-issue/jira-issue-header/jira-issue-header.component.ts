import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskWithSubTasks } from '../../../../../tasks/task.model';
import { isOnline$ } from 'src/app/util/is-online';
import { Observable } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'jira-issue-header',
  templateUrl: './jira-issue-header.component.html',
  styleUrls: ['./jira-issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, MatTooltip, AsyncPipe],
})
export class JiraIssueHeaderComponent {
  readonly task = input<TaskWithSubTasks>();
  isOnline$: Observable<boolean> = isOnline$;

  constructor() {}
}
