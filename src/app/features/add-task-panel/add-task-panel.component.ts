import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AddTaskPanelIntroComponent } from './add-task-panel-intro/add-task-panel-intro.component';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { IssueModule } from '../issue/issue.module';
import { MatTooltip } from '@angular/material/tooltip';
import { AddIssuesPanelComponent } from './add-issues-panel/add-issues-panel.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectIssueProvidersWithDisabledLast } from '../issue/store/issue-provider.selectors';
import { IssueProvider, IssueProviderKey } from '../issue/issue.model';
import {
  getIssueProviderInitials,
  getIssueProviderTooltip,
} from '../issue/get-issue-provider-tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ContextMenuComponent } from '../../ui/context-menu/context-menu.component';
import { MatMenuItem } from '@angular/material/menu';

import { UiModule } from '../../ui/ui.module';
import { T } from '../../t.const';
import { DialogEditIssueProviderComponent } from '../issue/dialog-edit-issue-provider/dialog-edit-issue-provider.component';

@Component({
  selector: 'add-task-panel',
  standalone: true,
  imports: [
    UiModule,
    AddTaskPanelIntroComponent,
    MatTabGroup,
    MatTab,
    MatTabLabel,
    MatIcon,
    IssueModule,
    MatTooltip,
    AddIssuesPanelComponent,
    MatTabContent,
    ContextMenuComponent,
    MatMenuItem,
  ],
  templateUrl: './add-task-panel.component.html',
  styleUrl: './add-task-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskPanelComponent {
  readonly T = T;
  private _store = inject(Store);
  private _matDialog = inject(MatDialog);

  isShowIntro = signal(false);
  issueProviders = toSignal(this._store.select(selectIssueProvidersWithDisabledLast));

  addProvider(ev: MouseEvent): void {
    ev.stopPropagation();
    ev.preventDefault();
    // this._matDialog.open(DialogAddIssueProviderComponent);
  }

  getToolTipText(issueProvider: IssueProvider): string {
    return getIssueProviderTooltip(issueProvider);
  }

  getIssueProviderInitials(issueProvider: IssueProvider): string | null | undefined {
    return getIssueProviderInitials(issueProvider);
  }

  openSetupDialog(issueProviderKey: IssueProviderKey): void {
    this._matDialog.open(DialogEditIssueProviderComponent, {
      restoreFocus: true,
      data: {
        issueProviderKey,
      },
    });
  }

  openEditIssueProvider(issueProvider: IssueProvider): void {
    this._matDialog.open(DialogEditIssueProviderComponent, {
      restoreFocus: true,
      data: {
        issueProvider,
      },
    });
  }
}
