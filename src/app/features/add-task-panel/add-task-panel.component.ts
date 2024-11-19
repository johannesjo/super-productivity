import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AddTaskPanelIntroComponent } from './add-task-panel-intro/add-task-panel-intro.component';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { IssueModule } from '../issue/issue.module';
import { MatTooltip } from '@angular/material/tooltip';
import { AddIssuesPanelComponent } from './add-issues-panel/add-issues-panel.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectEnabledIssueProviders } from '../issue/store/issue-provider.selectors';
import { IssueProvider } from '../issue/issue.model';
import { getIssueProviderTooltip } from '../issue/get-issue-provider-tooltip';

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
    AddIssuesPanelComponent,
    MatTabContent,
  ],
  templateUrl: './add-task-panel.component.html',
  styleUrl: './add-task-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelComponent {
  private _store = inject(Store);

  isShowIntro = signal(false);
  issueProviders = toSignal(this._store.select(selectEnabledIssueProviders));

  addProvider(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
  }

  getToolTipText(issueProvider: IssueProvider): string {
    return getIssueProviderTooltip(issueProvider);
  }
}
