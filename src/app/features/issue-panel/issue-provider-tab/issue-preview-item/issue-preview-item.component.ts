import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SearchResultItem } from '../../../issue/issue.model';

@Component({
  selector: 'issue-preview-item',
  standalone: true,
  imports: [MatIconButton, MatIcon],
  templateUrl: './issue-preview-item.component.html',
  styleUrl: './issue-preview-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePreviewItemComponent {
  itemData = input.required<SearchResultItem>();
  addIssue = output<SearchResultItem>();
}
