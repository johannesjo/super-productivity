import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'issue-panel-item',
  standalone: true,
  imports: [MatIconButton, MatIcon, MatMiniFabButton, MatTooltip],
  templateUrl: './issue-panel-item.component.html',
  styleUrl: './issue-panel-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssuePanelItemComponent {}
