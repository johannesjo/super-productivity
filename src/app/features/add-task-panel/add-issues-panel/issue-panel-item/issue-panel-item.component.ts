import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { SearchResultItem } from '../../../issue/issue.model';

@Component({
  selector: 'issue-panel-item',
  standalone: true,
  imports: [MatIconButton, MatIcon],
  templateUrl: './issue-panel-item.component.html',
  styleUrl: './issue-panel-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePanelItemComponent {
  itemData = input.required<SearchResultItem>();
  addIssue = output<SearchResultItem>();
}
