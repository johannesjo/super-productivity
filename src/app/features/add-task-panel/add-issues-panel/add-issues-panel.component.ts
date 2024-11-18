import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IssuePanelItemComponent } from './issue-panel-item/issue-panel-item.component';
import { AsyncPipe } from '@angular/common';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'add-issues-panel',
  standalone: true,
  imports: [
    IssuePanelItemComponent,
    AsyncPipe,
    CdkDrag,
    CdkDropList,
    MatIcon,
    MatIconButton,
  ],
  templateUrl: './add-issues-panel.component.html',
  styleUrl: './add-issues-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddIssuesPanelComponent {
  protected readonly Array = Array;
}
