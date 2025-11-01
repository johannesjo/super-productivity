import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskWithSubTasks } from '../../tasks/task.model';
import { ISSUE_PROVIDER_HUMANIZED, ISSUE_PROVIDER_ICON_MAP } from '../issue.const';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'issue-header',
  templateUrl: './issue-header.component.html',
  styleUrls: ['./issue-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
})
export class IssueHeaderComponent {
  task = input.required<TaskWithSubTasks>();

  readonly ISSUE_PROVIDER_ICON_MAP = ISSUE_PROVIDER_ICON_MAP;
  readonly ISSUE_PROVIDER_HUMANIZED = ISSUE_PROVIDER_HUMANIZED;
}
