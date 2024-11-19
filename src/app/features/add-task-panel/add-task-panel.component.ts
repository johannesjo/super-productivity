import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AddTaskPanelIntroComponent } from './add-task-panel-intro/add-task-panel-intro.component';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { IssueModule } from '../issue/issue.module';
import { MatTooltip } from '@angular/material/tooltip';
import { AddIssuesPanelComponent } from './add-issues-panel/add-issues-panel.component';

@Component({
  selector: 'add-task-panel',
  standalone: true,
  imports: [
    AddTaskPanelIntroComponent,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    MatIcon,
    MatIconButton,
    IssueModule,
    MatTooltip,
    MatButton,
    AddIssuesPanelComponent,
  ],
  templateUrl: './add-task-panel.component.html',
  styleUrl: './add-task-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelComponent {
  isShowIntro = signal(false);

  addProvider(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
  }
}
