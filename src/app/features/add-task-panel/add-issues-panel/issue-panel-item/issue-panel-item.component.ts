import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'issue-panel-item',
  standalone: true,
  imports: [],
  templateUrl: './issue-panel-item.component.html',
  styleUrl: './issue-panel-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePanelItemComponent {}
