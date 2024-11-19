import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { AddTaskPanel } from '../../add-task-panel.model';

@Component({
  selector: 'issue-panel-item',
  standalone: true,
  imports: [MatIconButton, MatIcon, MatMiniFabButton, MatTooltip],
  templateUrl: './issue-panel-item.component.html',
  styleUrl: './issue-panel-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePanelItemComponent {
  itemData = input.required<AddTaskPanel.IssueItem>();
}
