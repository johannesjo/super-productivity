import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { InboxIntroComponent } from './inbox-intro/inbox-intro.component';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { IssueModule } from '../issue/issue.module';
import { MatTooltip } from '@angular/material/tooltip';
import { AddIssuesPanelComponent } from './add-issues-panel/add-issues-panel.component';

@Component({
  selector: 'inbox',
  standalone: true,
  imports: [
    InboxIntroComponent,
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
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxComponent {
  isShowIntro = signal(false);

  addProvider(): void {
    console.log('I am here!');
  }
}
