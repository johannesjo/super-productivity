import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AddTaskPanelIntroComponent } from './add-task-panel-intro/add-task-panel-intro.component';
import { MatTab, MatTabContent, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatIcon } from '@angular/material/icon';
import { IssueModule } from '../issue/issue.module';
import { MatTooltip } from '@angular/material/tooltip';
import { AddIssuesPanelComponent } from './add-issues-panel/add-issues-panel.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectAll } from '../issue/store/issue-provider.selectors';
import { IssueProvider, IssueProviderKey } from '../issue/issue.model';
import {
  getIssueProviderInitials,
  getIssueProviderTooltip,
} from '../issue/get-issue-provider-tooltip';
import { MatDialog } from '@angular/material/dialog';
import { ContextMenuComponent } from '../../ui/context-menu/context-menu.component';
import { MatMenuItem } from '@angular/material/menu';
import { DialogJiraInitialSetupComponent } from '../issue/providers/jira/jira-view-components/dialog-jira-initial-setup/dialog-jira-initial-setup.component';
import { DialogGithubInitialSetupComponent } from '../issue/providers/github/github-view-components/dialog-github-initial-setup/dialog-github-initial-setup.component';
import { DialogGitlabInitialSetupComponent } from '../issue/providers/gitlab/dialog-gitlab-initial-setup/dialog-gitlab-initial-setup.component';
import { DialogCaldavInitialSetupComponent } from '../issue/providers/caldav/dialog-caldav-initial-setup/dialog-caldav-initial-setup.component';
import { DialogGiteaInitialSetupComponent } from '../issue/providers/gitea/gitea-view-components/dialog-gitea-initial-setup/dialog-gitea-initial-setup.component';
import { DialogRedmineInitialSetupComponent } from '../issue/providers/redmine/redmine-view-components/redmine-initial-setup/dialog-redmine-initial-setup.component';
import { DialogOpenProjectInitialSetupComponent } from '../issue/providers/open-project/open-project-view-components/dialog-open-project-initial-setup/dialog-open-project-initial-setup.component';
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
  issueProviders = toSignal(this._store.select(selectAll));

  private _components = {
    JIRA: DialogJiraInitialSetupComponent,
    GITHUB: DialogGithubInitialSetupComponent,
    GITLAB: DialogGitlabInitialSetupComponent,
    CALDAV: DialogCaldavInitialSetupComponent,
    GITEA: DialogGiteaInitialSetupComponent,
    REDMINE: DialogRedmineInitialSetupComponent,
    OPEN_PROJECT: DialogOpenProjectInitialSetupComponent,
  };

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
