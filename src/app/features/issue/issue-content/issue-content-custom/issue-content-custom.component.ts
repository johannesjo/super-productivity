import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IssueFieldConfig, IssueContentConfig } from '../issue-content-config.model';
import { IssueData } from '../../issue.model';
import { OpenProjectAttachmentsComponent } from './open-project-attachments/open-project-attachments.component';
import { JiraLinkComponent } from './jira-link/jira-link.component';

@Component({
  selector: 'issue-content-custom',
  templateUrl: './issue-content-custom.component.html',
  styleUrls: ['./issue-content-custom.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OpenProjectAttachmentsComponent, JiraLinkComponent],
})
export class IssueContentCustomComponent {
  readonly field = input.required<IssueFieldConfig>();
  readonly issue = input.required<IssueData>();
  readonly config = input.required<IssueContentConfig>();
  readonly task = input.required<any>();

  getFieldValue(field: IssueFieldConfig, issue: IssueData): any {
    if (field.getValue) {
      return field.getValue(issue);
    }

    // Handle nested fields like 'status.name'
    const keys = field.field.split('.');
    let value: any = issue;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }
}
