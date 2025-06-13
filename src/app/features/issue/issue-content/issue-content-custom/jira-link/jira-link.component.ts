import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { JiraCommonInterfacesService } from '../../../providers/jira/jira-common-interfaces.service';
import { TaskCopy } from '../../../../tasks/task.model';
import { IssueData } from '../../../issue.model';
import { IssueFieldConfig } from '../../issue-content.model';

@Component({
  selector: 'jira-link',
  templateUrl: './jira-link.component.html',
  styleUrls: ['./jira-link.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class JiraLinkComponent {
  private _jiraCommonInterfacesService = inject(JiraCommonInterfacesService, {
    optional: true,
  });

  readonly field = input.required<IssueFieldConfig>();
  readonly issue = input.required<IssueData>();
  readonly task = input.required<TaskCopy>();

  issueUrl = signal('');

  constructor() {
    effect(async () => {
      const task = this.task();
      if (
        !task?.issueId ||
        !task?.issueProviderId ||
        !this._jiraCommonInterfacesService ||
        typeof this._jiraCommonInterfacesService.issueLink !== 'function'
      ) {
        this.issueUrl.set('');
        return;
      }
      try {
        const url = await this._jiraCommonInterfacesService.issueLink(
          task.issueId,
          task.issueProviderId,
        );
        this.issueUrl.set(url);
      } catch {
        this.issueUrl.set('');
      }
    });
  }

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
    return value;
  });
}
